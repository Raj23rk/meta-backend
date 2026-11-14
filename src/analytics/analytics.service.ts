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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      contactCounts,
      totalCampaigns,
      messageMetricsAgg,
      dailyStats,
    ] = await Promise.all([
      // 1. Single aggregation for contact counts (total & opted-in)
      this.contactModel.aggregate([
        { $match: { organizationId: orgObjId } },
        {
          $group: {
            _id: null,
            totalContacts: { $sum: 1 },
            optedInContacts: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$optOut', false] }, { $eq: ['$consentStatus', 'opted_in'] }] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      // 2. Total campaigns
      this.campaignModel.countDocuments({ organizationId: orgObjId }),

      // 3. Single aggregation for ALL message metrics
      this.messageModel.aggregate([
        { $match: { organizationId: orgObjId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'read']] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'read']] }, 1, 0] } },
            read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            inbound: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
          },
        },
      ]),

      // 4. Daily timeline for last 7 days
      this.messageModel.aggregate([
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
      ]),
    ]);

    const totalContacts = contactCounts[0]?.totalContacts || 0;
    const optedInContacts = contactCounts[0]?.optedInContacts || 0;

    const messageMetrics = messageMetricsAgg[0] || {
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      inbound: 0,
    };

    const sent = messageMetrics.sent;
    const delivered = messageMetrics.delivered;
    const read = messageMetrics.read;
    const failed = messageMetrics.failed;
    const inbound = messageMetrics.inbound;
    const totalMessages = messageMetrics.total;

    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 100;
    const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;

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

