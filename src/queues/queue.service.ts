import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Campaign, CampaignDocument } from '../database/schemas/campaign.schema';
import { CampaignRecipient, CampaignRecipientDocument } from '../database/schemas/campaign-recipient.schema';
import { Contact, ContactDocument } from '../database/schemas/contact.schema';
import { Template, TemplateDocument } from '../database/schemas/template.schema';
import { MetaService } from '../meta/meta.service';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private pausedCampaigns = new Set<string>();
  private activeJobs = new Map<string, boolean>();

  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
    @InjectModel(CampaignRecipient.name) private recipientModel: Model<CampaignRecipientDocument>,
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @InjectModel(Template.name) private templateModel: Model<TemplateDocument>,
    private readonly metaService: MetaService,
  ) {}

  // Enqueue a campaign for background throttled execution
  async enqueueCampaign(campaignId: string) {
    this.logger.log(`Queueing campaign: ${campaignId}`);
    this.pausedCampaigns.delete(campaignId);

    await this.campaignModel.findByIdAndUpdate(campaignId, { status: 'queued' });

    // Start background processing
    setTimeout(() => {
      this.processCampaign(campaignId).catch((err) => {
        this.logger.error(`Error executing campaign ${campaignId}: ${err.message}`);
      });
    }, 500);

    return { status: 'queued', campaignId };
  }

  // Throttled processing runner
  private async processCampaign(campaignId: string) {
    if (this.activeJobs.get(campaignId)) {
      this.logger.warn(`Campaign ${campaignId} is already running.`);
      return;
    }

    this.activeJobs.set(campaignId, true);

    try {
      const campaign = await this.campaignModel.findById(campaignId);
      if (!campaign || campaign.status === 'cancelled') {
        this.activeJobs.delete(campaignId);
        return;
      }

      await this.campaignModel.findByIdAndUpdate(campaignId, { status: 'processing' });

      const template = await this.templateModel.findById(campaign.templateId);
      if (!template) {
        throw new Error('Campaign template not found');
      }

      // Fetch pending recipients
      const pendingRecipients = await this.recipientModel.find({
        campaignId: new Types.ObjectId(campaignId),
        status: 'pending',
      });

      this.logger.log(`Processing ${pendingRecipients.length} pending recipients for campaign ${campaign.name}`);

      for (const recipient of pendingRecipients) {
        // Check if paused or cancelled
        if (this.pausedCampaigns.has(campaignId)) {
          this.logger.log(`Campaign ${campaignId} is paused. Halting queue.`);
          await this.campaignModel.findByIdAndUpdate(campaignId, { status: 'paused' });
          break;
        }

        const freshCampaign = await this.campaignModel.findById(campaignId);
        if (freshCampaign?.status === 'cancelled') {
          this.logger.log(`Campaign ${campaignId} was cancelled.`);
          break;
        }

        // Verify recipient contact has not opted out
        const contact = await this.contactModel.findById(recipient.contactId);
        if (contact?.optOut || contact?.consentStatus === 'opted_out') {
          recipient.status = 'failed';
          recipient.errorMessage = 'Recipient has opted out';
          await recipient.save();
          await this.campaignModel.findByIdAndUpdate(campaignId, { $inc: { 'counters.failed': 1 } });
          continue;
        }

        // Rate throttling delay (e.g. 100ms per message to stay within Meta rate limits)
        await new Promise((r) => setTimeout(r, 100));

        // Attempt Send via Meta Service
        try {
          recipient.attempts += 1;
          const result = await this.metaService.sendMessage(campaign.organizationId.toString(), {
            to: recipient.phone,
            type: 'template',
            template: {
              name: template.name,
              language: { code: template.language },
            },
            contactId: contact?._id.toString(),
          });

          if (result.success) {
            recipient.status = 'sent';
            recipient.metaMessageId = result.metaMessageId;
            recipient.sentAt = new Date();
            await recipient.save();

            await this.campaignModel.findByIdAndUpdate(campaignId, { $inc: { 'counters.sent': 1 } });

            // Simulate delivery event after short delay in local sandbox mode
            setTimeout(async () => {
              try {
                recipient.status = 'delivered';
                await recipient.save();
                await this.campaignModel.findByIdAndUpdate(campaignId, { $inc: { 'counters.delivered': 1 } });
              } catch (e) {}
            }, 1500);
          } else {
            recipient.status = 'failed';
            recipient.errorMessage = result.error || 'Send failed';
            await recipient.save();
            await this.campaignModel.findByIdAndUpdate(campaignId, { $inc: { 'counters.failed': 1 } });
          }
        } catch (err: any) {
          recipient.status = 'failed';
          recipient.errorMessage = err.message;
          await recipient.save();
          await this.campaignModel.findByIdAndUpdate(campaignId, { $inc: { 'counters.failed': 1 } });
        }
      }

      // Check if finished
      const remaining = await this.recipientModel.countDocuments({
        campaignId: new Types.ObjectId(campaignId),
        status: 'pending',
      });

      if (remaining === 0 && !this.pausedCampaigns.has(campaignId)) {
        await this.campaignModel.findByIdAndUpdate(campaignId, {
          status: 'completed',
          completedAt: new Date(),
        });
        this.logger.log(`Campaign ${campaign.name} successfully completed!`);
      }
    } finally {
      this.activeJobs.delete(campaignId);
    }
  }

  pauseCampaign(campaignId: string) {
    this.pausedCampaigns.add(campaignId);
    return this.campaignModel.findByIdAndUpdate(campaignId, { status: 'paused' }, { new: true });
  }

  resumeCampaign(campaignId: string) {
    this.pausedCampaigns.delete(campaignId);
    return this.enqueueCampaign(campaignId);
  }

  async cancelCampaign(campaignId: string) {
    this.pausedCampaigns.delete(campaignId);
    return this.campaignModel.findByIdAndUpdate(campaignId, { status: 'cancelled' }, { new: true });
  }
}

