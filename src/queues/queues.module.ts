import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QueueService } from './queue.service';
import { Campaign, CampaignSchema } from '../database/schemas/campaign.schema';
import { CampaignRecipient, CampaignRecipientSchema } from '../database/schemas/campaign-recipient.schema';
import { Contact, ContactSchema } from '../database/schemas/contact.schema';
import { Template, TemplateSchema } from '../database/schemas/template.schema';
import { MetaModule } from '../meta/meta.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
      { name: CampaignRecipient.name, schema: CampaignRecipientSchema },
      { name: Contact.name, schema: ContactSchema },
      { name: Template.name, schema: TemplateSchema },
    ]),
    MetaModule,
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueuesModule {}

