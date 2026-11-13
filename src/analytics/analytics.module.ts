import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Message, MessageSchema } from '../database/schemas/message.schema';
import { Contact, ContactSchema } from '../database/schemas/contact.schema';
import { Campaign, CampaignSchema } from '../database/schemas/campaign.schema';
import { Template, TemplateSchema } from '../database/schemas/template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Contact.name, schema: ContactSchema },
      { name: Campaign.name, schema: CampaignSchema },
      { name: Template.name, schema: TemplateSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

