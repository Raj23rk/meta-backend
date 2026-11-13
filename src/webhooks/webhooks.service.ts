import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WebhookEvent, WebhookEventDocument } from '../database/schemas/webhook-event.schema';
import { Message, MessageDocument } from '../database/schemas/message.schema';
import { Contact, ContactDocument } from '../database/schemas/contact.schema';
import { CampaignRecipient, CampaignRecipientDocument } from '../database/schemas/campaign-recipient.schema';
import { Campaign, CampaignDocument } from '../database/schemas/campaign.schema';
import { PhoneNumber, PhoneNumberDocument } from '../database/schemas/phone-number.schema';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectModel(WebhookEvent.name) private webhookEventModel: Model<WebhookEventDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @InjectModel(CampaignRecipient.name) private recipientModel: Model<CampaignRecipientDocument>,
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
    @InjectModel(PhoneNumber.name) private phoneModel: Model<PhoneNumberDocument>,
  ) {}

  // Verify Webhook Challenge from Meta
  verifyChallenge(mode: string, token: string, challenge: string): string | null {
    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'whatsapp_webhook_verify_token_secure_123';
    if (mode === 'subscribe' && token === expectedToken) {
      this.logger.log('Meta Webhook Challenge successfully verified');
      return challenge;
    }
    this.logger.warn(`Webhook challenge failed: received token '${token}'`);
    return null;
  }

  // Idempotently process incoming webhook payloads
  async processEvent(payload: any) {
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) {
      return { status: 'ignored', reason: 'No change value present' };
    }

    const phoneNumberId = value.metadata?.phone_number_id;

    // 1. Process Status Updates (sent, delivered, read, failed)
    if (value.statuses && value.statuses.length > 0) {
      for (const statusObj of value.statuses) {
        await this.handleStatusUpdate(statusObj, phoneNumberId);
      }
    }

    // 2. Process Inbound Messages
    if (value.messages && value.messages.length > 0) {
      for (const msgObj of value.messages) {
        const contactProfile = value.contacts?.find((c: any) => c.wa_id === msgObj.from);
        await this.handleInboundMessage(msgObj, contactProfile, phoneNumberId);
      }
    }

    return { status: 'processed' };
  }

  private async handleStatusUpdate(statusObj: any, phoneNumberId: string) {
    const metaMessageId = statusObj.id;
    const newStatus = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
    const eventId = `status_${metaMessageId}_${newStatus}`;

    // Idempotency check
    const existingEvent = await this.webhookEventModel.findOne({ providerEventId: eventId });
    if (existingEvent) {
      this.logger.debug(`Duplicate webhook event skipped: ${eventId}`);
      return;
    }

    // Record webhook event
    await this.webhookEventModel.create({
      providerEventId: eventId,
      eventType: `message_${newStatus}`,
      rawPayload: statusObj,
      processingStatus: 'processed',
    });

    // Update Message document
    const message = await this.messageModel.findOne({ metaMessageId });
    if (message) {
      message.status = newStatus;
      if (statusObj.errors && statusObj.errors.length > 0) {
        message.errorCode = statusObj.errors[0].code?.toString();
        message.errorMessage = statusObj.errors[0].title || statusObj.errors[0].message;
      }
      await message.save();

      // Update CampaignRecipient if part of a campaign
      const recipient = await this.recipientModel.findOne({ metaMessageId });
      if (recipient) {
        recipient.status = newStatus;
        if (message.errorMessage) recipient.errorMessage = message.errorMessage;
        await recipient.save();

        // Increment campaign counter
        if (newStatus === 'delivered') {
          await this.campaignModel.findByIdAndUpdate(recipient.campaignId, { $inc: { 'counters.delivered': 1 } });
        } else if (newStatus === 'read') {
          await this.campaignModel.findByIdAndUpdate(recipient.campaignId, { $inc: { 'counters.read': 1 } });
        } else if (newStatus === 'failed') {
          await this.campaignModel.findByIdAndUpdate(recipient.campaignId, { $inc: { 'counters.failed': 1 } });
        }
      }

      this.logger.log(`Message ${metaMessageId} status updated to: ${newStatus}`);
    }
  }

  private async handleInboundMessage(msgObj: any, contactProfile: any, phoneNumberId: string) {
    const metaMessageId = msgObj.id;
    const eventId = `inbound_${metaMessageId}`;

    // Deduplication check
    const existing = await this.webhookEventModel.findOne({ providerEventId: eventId });
    if (existing) return;

    await this.webhookEventModel.create({
      providerEventId: eventId,
      eventType: 'message_inbound',
      rawPayload: msgObj,
      processingStatus: 'processed',
    });

    const senderPhone = msgObj.from;
    const senderName = contactProfile?.profile?.name || `WhatsApp User ${senderPhone.slice(-4)}`;

    // Find the organization associated with this phone_number_id
    let phoneRecord = await this.phoneModel.findOne({ phoneNumberId });
    if (!phoneRecord) {
      phoneRecord = await this.phoneModel.findOne(); // Fallback to primary phone
    }

    if (!phoneRecord) {
      this.logger.warn(`No phone record found for inbound message from ${senderPhone}`);
      return;
    }

    const orgId = phoneRecord.organizationId;

    // Find or create Contact
    let contact = await this.contactModel.findOne({ organizationId: orgId, phone: senderPhone });
    if (!contact) {
      contact = await this.contactModel.create({
        organizationId: orgId,
        phone: senderPhone,
        name: senderName,
        consentStatus: 'opted_in',
        consentSource: 'inbound_message',
        consentTimestamp: new Date(),
        optOut: false,
      });
    }

    // Extract text content
    let content = '[Unsupported Message Type]';
    if (msgObj.type === 'text') {
      content = msgObj.text?.body || '';
    } else if (msgObj.type === 'image') {
      content = '[Image Message]';
    } else if (msgObj.type === 'interactive') {
      content = msgObj.interactive?.button_reply?.title || msgObj.interactive?.list_reply?.title || '[Interactive Response]';
    }

    // Save Inbound Message
    await this.messageModel.create({
      organizationId: orgId,
      contactId: contact._id,
      phoneNumberId,
      metaMessageId,
      direction: 'inbound',
      type: msgObj.type || 'text',
      content,
      status: 'delivered',
      timestamp: new Date(parseInt(msgObj.timestamp, 10) * 1000 || Date.now()),
    });

    this.logger.log(`Received inbound message from ${senderName} (${senderPhone}): "${content}"`);
  }

  // Developer / Simulator Endpoint: trigger realistic status or inbound reply
  async simulateWebhookEvent(data: {
    eventType: 'delivered' | 'read' | 'failed' | 'inbound_reply';
    metaMessageId?: string;
    senderPhone?: string;
    replyText?: string;
  }) {
    if (data.eventType === 'inbound_reply') {
      return this.processEvent({
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: '102938475610293' },
                  contacts: [{ profile: { name: 'Customer Test User' }, wa_id: data.senderPhone || '15551234567' }],
                  messages: [
                    {
                      from: data.senderPhone || '15551234567',
                      id: `wamid.HBgM${Date.now()}REPLY`,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: { body: data.replyText || 'Hello, I have a question about my order.' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
    } else {
      return this.processEvent({
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: '102938475610293' },
                  statuses: [
                    {
                      id: data.metaMessageId || `wamid.HBgM${Date.now()}`,
                      status: data.eventType,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      recipient_id: data.senderPhone || '15551234567',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
    }
  }
}

