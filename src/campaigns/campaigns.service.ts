import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Campaign, CampaignDocument } from '../database/schemas/campaign.schema';
import { CampaignRecipient, CampaignRecipientDocument } from '../database/schemas/campaign-recipient.schema';
import { Contact, ContactDocument } from '../database/schemas/contact.schema';
import { QueueService } from '../queues/queue.service';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
    @InjectModel(CampaignRecipient.name) private recipientModel: Model<CampaignRecipientDocument>,
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    private readonly queueService: QueueService,
  ) {}

  async findAll(organizationId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    return this.campaignModel
      .find({ organizationId: orgObjId })
      .populate('templateId')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findOne(organizationId: string, id: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const campaign: any = await this.campaignModel
      .findOne({ _id: new Types.ObjectId(id), organizationId: orgObjId })
      .populate('templateId')
      .lean();

    if (!campaign) throw new NotFoundException('Campaign not found');

    const recipients = await this.recipientModel
      .find({ campaignId: campaign._id })
      .populate('contactId')
      .limit(100)
      .lean();

    return {
      ...campaign,
      recipients,
    };
  }

  async create(organizationId: string, data: {
    name: string;
    templateId: string;
    audienceType: 'all' | 'tags';
    targetTags?: string[];
  }) {
    const orgObjId = new Types.ObjectId(organizationId);

    // Find eligible opted-in contacts
    const filter: any = {
      organizationId: orgObjId,
      optOut: false,
      consentStatus: 'opted_in',
    };

    if (data.audienceType === 'tags' && data.targetTags && data.targetTags.length > 0) {
      filter.tags = { $in: data.targetTags };
    }

    const contacts = await this.contactModel.find(filter);

    if (contacts.length === 0) {
      throw new BadRequestException('No eligible opted-in contacts found for the selected audience criteria');
    }

    const campaign = await this.campaignModel.create({
      organizationId: orgObjId,
      name: data.name,
      templateId: new Types.ObjectId(data.templateId),
      audienceType: data.audienceType,
      targetTags: data.targetTags || [],
      status: 'draft',
      counters: {
        total: contacts.length,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      },
    });

    // Populate recipients
    const recipientDocs = contacts.map((contact) => ({
      campaignId: campaign._id,
      organizationId: orgObjId,
      contactId: contact._id,
      phone: contact.phone,
      status: 'pending',
      attempts: 0,
    }));

    await this.recipientModel.insertMany(recipientDocs);

    return campaign;
  }

  async start(organizationId: string, id: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const campaign = await this.campaignModel.findOne({ _id: new Types.ObjectId(id), organizationId: orgObjId });
    if (!campaign) throw new NotFoundException('Campaign not found');

    return this.queueService.enqueueCampaign(campaign._id.toString());
  }

  async pause(organizationId: string, id: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const campaign = await this.campaignModel.findOne({ _id: new Types.ObjectId(id), organizationId: orgObjId });
    if (!campaign) throw new NotFoundException('Campaign not found');

    return this.queueService.pauseCampaign(campaign._id.toString());
  }

  async resume(organizationId: string, id: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const campaign = await this.campaignModel.findOne({ _id: new Types.ObjectId(id), organizationId: orgObjId });
    if (!campaign) throw new NotFoundException('Campaign not found');

    return this.queueService.resumeCampaign(campaign._id.toString());
  }

  async cancel(organizationId: string, id: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const campaign = await this.campaignModel.findOne({ _id: new Types.ObjectId(id), organizationId: orgObjId });
    if (!campaign) throw new NotFoundException('Campaign not found');

    return this.queueService.cancelCampaign(campaign._id.toString());
  }
}

