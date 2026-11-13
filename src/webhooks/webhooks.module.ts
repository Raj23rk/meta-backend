import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhookEvent, WebhookEventSchema } from '../database/schemas/webhook-event.schema';
import { Message, MessageSchema } from '../database/schemas/message.schema';
import { Contact, ContactSchema } from '../database/schemas/contact.schema';
import { CampaignRecipient, CampaignRecipientSchema } from '../database/schemas/campaign-recipient.schema';
import { Campaign, CampaignSchema } from '../database/schemas/campaign.schema';
import { PhoneNumber, PhoneNumberSchema } from '../database/schemas/phone-number.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookEvent.name, schema: WebhookEventSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Contact.name, schema: ContactSchema },
      { name: CampaignRecipient.name, schema: CampaignRecipientSchema },
      { name: Campaign.name, schema: CampaignSchema },
      { name: PhoneNumber.name, schema: PhoneNumberSchema },
    ]),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}

