import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { Contact, ContactSchema } from '../database/schemas/contact.schema';
import { Segment, SegmentSchema } from '../database/schemas/segment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contact.name, schema: ContactSchema },
      { name: Segment.name, schema: SegmentSchema },
    ]),
  ],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}

