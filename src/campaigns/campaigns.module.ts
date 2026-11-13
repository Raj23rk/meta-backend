import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { Campaign, CampaignSchema } from '../database/schemas/campaign.schema';
import { CampaignRecipient, CampaignRecipientSchema } from '../database/schemas/campaign-recipient.schema';
import { Contact, ContactSchema } from '../database/schemas/contact.schema';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
      { name: CampaignRecipient.name, schema: CampaignRecipientSchema },
      { name: Contact.name, schema: ContactSchema },
    ]),
    QueuesModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}

