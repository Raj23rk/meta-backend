import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetaService } from './meta.service';
import { MetaController } from './meta.controller';
import { WhatsAppAccount, WhatsAppAccountSchema } from '../database/schemas/whatsapp-account.schema';
import { PhoneNumber, PhoneNumberSchema } from '../database/schemas/phone-number.schema';
import { Template, TemplateSchema } from '../database/schemas/template.schema';
import { Message, MessageSchema } from '../database/schemas/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsAppAccount.name, schema: WhatsAppAccountSchema },
      { name: PhoneNumber.name, schema: PhoneNumberSchema },
      { name: Template.name, schema: TemplateSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [MetaController],
  providers: [MetaService],
  exports: [MetaService],
})
export class MetaModule {}

