import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization, OrganizationDocument } from '../database/schemas/organization.schema';
import { Membership, MembershipDocument, Role } from '../database/schemas/membership.schema';
import { WhatsAppAccount, WhatsAppAccountDocument } from '../database/schemas/whatsapp-account.schema';
import { Contact, ContactDocument } from '../database/schemas/contact.schema';
import { Message, MessageDocument } from '../database/schemas/message.schema';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name) private orgModel: Model<OrganizationDocument>,
    @InjectModel(Membership.name) private membershipModel: Model<MembershipDocument>,
    @InjectModel(WhatsAppAccount.name) private wabaModel: Model<WhatsAppAccountDocument>,
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async findAll(): Promise<any[]> {
    const orgs = await this.orgModel.find().sort({ createdAt: -1 }).lean();
    
    // Enrich with statistics
    const enriched = await Promise.all(
      orgs.map(async (org) => {
        const [waba, contactsCount, messagesCount] = await Promise.all([
          this.wabaModel.findOne({ organizationId: org._id }),
          this.contactModel.countDocuments({ organizationId: org._id }),
          this.messageModel.countDocuments({ organizationId: org._id }),
        ]);

        return {
          ...org,
          id: org._id.toString(),
          wabaConnected: waba ? waba.connectionStatus === 'connected' : false,
          wabaId: waba ? waba.wabaId : null,
          contactsCount,
          messagesCount,
        };
      }),
    );

    return enriched;
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid organization ID');
    }
    const org = await this.orgModel.findById(id);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    const waba = await this.wabaModel.findOne({ organizationId: org._id });
    return {
      ...org.toObject(),
      id: org._id.toString(),
      wabaConnected: waba ? waba.connectionStatus === 'connected' : false,
      wabaId: waba ? waba.wabaId : null,
    };
  }

  async create(createDto: { name: string; plan?: string; monthlyQuota?: number }) {
    const org = await this.orgModel.create({
      name: createDto.name,
      status: 'active',
      plan: createDto.plan || 'starter',
      settings: {
        monthlyQuota: createDto.monthlyQuota || 10000,
        currentMonthUsage: 0,
        wabaConnected: false,
      },
    });

    return {
      ...org.toObject(),
      id: org._id.toString(),
    };
  }

  async update(id: string, updateDto: any) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid organization ID');
    }
    const org = await this.orgModel.findByIdAndUpdate(id, { $set: updateDto }, { new: true });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async getStats(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid organization ID');
    }
    const orgObjId = new Types.ObjectId(id);

    const [contacts, messages, waba] = await Promise.all([
      this.contactModel.countDocuments({ organizationId: orgObjId }),
      this.messageModel.countDocuments({ organizationId: orgObjId }),
      this.wabaModel.findOne({ organizationId: orgObjId }),
    ]);

    const sent = await this.messageModel.countDocuments({ organizationId: orgObjId, status: { $in: ['sent', 'delivered', 'read'] } });
    const delivered = await this.messageModel.countDocuments({ organizationId: orgObjId, status: { $in: ['delivered', 'read'] } });
    const read = await this.messageModel.countDocuments({ organizationId: orgObjId, status: 'read' });
    const failed = await this.messageModel.countDocuments({ organizationId: orgObjId, status: 'failed' });

    return {
      contactsCount: contacts,
      messagesCount: messages,
      wabaConnected: waba?.connectionStatus === 'connected',
      wabaDetails: waba,
      deliveryStats: {
        sent,
        delivered,
        read,
        failed,
        deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 100,
        readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
      },
    };
  }
}

