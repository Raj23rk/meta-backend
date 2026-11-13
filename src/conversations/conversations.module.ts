import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { Message, MessageSchema } from '../database/schemas/message.schema';
import { Contact, ContactSchema } from '../database/schemas/contact.schema';
import { MetaModule } from '../meta/meta.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Contact.name, schema: ContactSchema },
    ]),
    MetaModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}

