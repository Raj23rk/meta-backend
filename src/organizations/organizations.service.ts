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
    const orgs: any[] = await this.orgModel.find().sort({ createdAt: -1 }).lean();
    if (orgs.length === 0) return [];

    const orgIds = orgs.map((o) => o._id);

    // Batch fetch all WABAs and counts in 3 parallel fast queries instead of 3xN queries
    const [wabas, contactStats, messageStats] = await Promise.all([
      this.wabaModel.find({ organizationId: { $in: orgIds } }).lean(),
      this.contactModel.aggregate([
        { $match: { organizationId: { $in: orgIds } } },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } },
      ]),
      this.messageModel.aggregate([
        { $match: { organizationId: { $in: orgIds } } },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } },
      ]),
    ]);

    const wabaMap = new Map<string, any>(wabas.map((w: any) => [w.organizationId.toString(), w]));
    const contactCountMap = new Map<string, number>(contactStats.map((c: any) => [c._id.toString(), c.count]));
    const messageCountMap = new Map<string, number>(messageStats.map((m: any) => [m._id.toString(), m.count]));

    return orgs.map((org: any) => {
      const orgIdStr = org._id.toString();
      const waba = wabaMap.get(orgIdStr);
      return {
        ...org,
        id: orgIdStr,
        wabaConnected: waba ? waba.connectionStatus === 'connected' : false,
        wabaId: waba ? waba.wabaId : null,
        contactsCount: contactCountMap.get(orgIdStr) || 0,
        messagesCount: messageCountMap.get(orgIdStr) || 0,
      };
    });
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid organization ID');
    }

    const orgObjId = new Types.ObjectId(id);
    const [org, waba] = await Promise.all([
      this.orgModel.findById(orgObjId).lean() as Promise<any>,
      this.wabaModel.findOne({ organizationId: orgObjId }).lean() as Promise<any>,
    ]);

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return {
      ...org,
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

