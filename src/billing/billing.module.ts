import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Organization, OrganizationSchema } from '../database/schemas/organization.schema';
import { UsageRecord, UsageRecordSchema } from '../database/schemas/usage-record.schema';
import { Invoice, InvoiceSchema } from '../database/schemas/invoice.schema';
import { Message, MessageSchema } from '../database/schemas/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: UsageRecord.name, schema: UsageRecordSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}

