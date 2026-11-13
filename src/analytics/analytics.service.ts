import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from '../database/schemas/message.schema';
import { Contact, ContactDocument } from '../database/schemas/contact.schema';
import { Campaign, CampaignDocument } from '../database/schemas/campaign.schema';
import { Template, TemplateDocument } from '../database/schemas/template.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
    @InjectModel(Template.name) private templateModel: Model<TemplateDocument>,
  ) {}

  async getOverview(organizationId: string) {
    const orgObjId = new Types.ObjectId(organizationId);

    const [totalContacts, optedInContacts, totalMessages, totalCampaigns] = await Promise.all([
      this.contactModel.countDocuments({ organizationId: orgObjId }),
      this.contactModel.countDocuments({ organizationId: orgObjId, optOut: false, consentStatus: 'opted_in' }),
      this.messageModel.countDocuments({ organizationId: orgObjId }),
      this.campaignModel.countDocuments({ organizationId: orgObjId }),
    ]);

    const sent = await this.messageModel.countDocuments({ organizationId: orgObjId, status: { $in: ['sent', 'delivered', 'read'] } });
    const delivered = await this.messageModel.countDocuments({ organizationId: orgObjId, status: { $in: ['delivered', 'read'] } });
    const read = await this.messageModel.countDocuments({ organizationId: orgObjId, status: 'read' });
    const failed = await this.messageModel.countDocuments({ organizationId: orgObjId, status: 'failed' });
    const inbound = await this.messageModel.countDocuments({ organizationId: orgObjId, direction: 'inbound' });

    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 100;
    const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;

    // Timeline for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyStats = await this.messageModel.aggregate([
      {
        $match: {
          organizationId: orgObjId,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sent: { $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'read']] }, 1, 0] } },
          inbound: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      totalContacts,
      optedInContacts,
      totalMessages,
      totalCampaigns,
      metrics: {
        sent,
        delivered,
        read,
        failed,
        inbound,
        deliveryRate,
        readRate,
      },
      dailyStats,
    };
  }
}

