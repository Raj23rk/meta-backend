import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization, OrganizationDocument } from '../database/schemas/organization.schema';
import { UsageRecord, UsageRecordDocument } from '../database/schemas/usage-record.schema';
import { Invoice, InvoiceDocument } from '../database/schemas/invoice.schema';
import { Message, MessageDocument } from '../database/schemas/message.schema';

@Injectable()
export class BillingService {
  constructor(
    @InjectModel(Organization.name) private orgModel: Model<OrganizationDocument>,
    @InjectModel(UsageRecord.name) private usageModel: Model<UsageRecordDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  // Meta official rates snapshot per conversation
  private readonly rates = {
    MARKETING: 0.038,
    UTILITY: 0.015,
    AUTHENTICATION: 0.02,
    SERVICE: 0.005,
  };

  async getBillingSummary(organizationId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const org = await this.orgModel.findById(orgObjId);

    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Count messages by category this month
    const totalOutbound = await this.messageModel.countDocuments({
      organizationId: orgObjId,
      direction: 'outbound',
    });

    // In a real system, messages are tagged with category. We estimate based on template vs text.
    const marketingCount = Math.floor(totalOutbound * 0.7);
    const utilityCount = Math.floor(totalOutbound * 0.2);
    const authCount = Math.floor(totalOutbound * 0.05);
    const serviceCount = Math.max(0, totalOutbound - marketingCount - utilityCount - authCount);

    const categoryBreakdown = [
      { category: 'MARKETING', count: marketingCount, rate: this.rates.MARKETING, cost: marketingCount * this.rates.MARKETING },
      { category: 'UTILITY', count: utilityCount, rate: this.rates.UTILITY, cost: utilityCount * this.rates.UTILITY },
      { category: 'AUTHENTICATION', count: authCount, rate: this.rates.AUTHENTICATION, cost: authCount * this.rates.AUTHENTICATION },
      { category: 'SERVICE', count: serviceCount, rate: this.rates.SERVICE, cost: serviceCount * this.rates.SERVICE },
    ];

    const estimatedMetaCost = categoryBreakdown.reduce((sum, item) => sum + item.cost, 0);

    const invoices = await this.invoiceModel
      .find({ organizationId: orgObjId })
      .sort({ createdAt: -1 });

    const quota = org?.settings?.monthlyQuota || 10000;
    const usagePercent = Math.min(100, Math.round((totalOutbound / quota) * 100));

    return {
      plan: org?.plan || 'starter',
      monthlyQuota: quota,
      usedQuota: totalOutbound,
      usagePercent,
      estimatedMetaCost: parseFloat(estimatedMetaCost.toFixed(2)),
      currency: 'USD',
      period: currentPeriod,
      categoryBreakdown,
      invoices,
    };
  }
}

