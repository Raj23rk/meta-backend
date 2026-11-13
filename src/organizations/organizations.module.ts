import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { Organization, OrganizationSchema } from '../database/schemas/organization.schema';
import { Membership, MembershipSchema } from '../database/schemas/membership.schema';
import { WhatsAppAccount, WhatsAppAccountSchema } from '../database/schemas/whatsapp-account.schema';
import { Contact, ContactSchema } from '../database/schemas/contact.schema';
import { Message, MessageSchema } from '../database/schemas/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: WhatsAppAccount.name, schema: WhatsAppAccountSchema },
      { name: Contact.name, schema: ContactSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}

