import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from '../database/schemas/message.schema';
import { Contact, ContactDocument } from '../database/schemas/contact.schema';
import { MetaService } from '../meta/meta.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    private readonly metaService: MetaService,
  ) {}

  // List all conversation threads with latest message
  async getConversations(organizationId: string) {
    const orgObjId = new Types.ObjectId(organizationId);

    // Aggregate latest message per contact
    const threads = await this.messageModel.aggregate([
      { $match: { organizationId: orgObjId, contactId: { $exists: true, $ne: null } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$contactId',
          latestMessage: { $first: '$$ROOT' },
          totalMessages: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$direction', 'inbound'] }, { $ne: ['$status', 'read'] }] }, 1, 0],
            },
          },
        },
      },
      { $sort: { 'latestMessage.timestamp': -1 } },
    ]);

    // Batch-populate contact info in 1 single fast indexed query
    const contactIds = threads.map((t) => t._id).filter(Boolean);
    const contacts = await this.contactModel
      .find({ _id: { $in: contactIds } })
      .select('name phone optOut')
      .lean();

    const contactMap = new Map<string, any>(contacts.map((c: any) => [c._id.toString(), c]));

    const populated = threads.map((t) => {
      const contact = contactMap.get(t._id?.toString());
      return {
        contactId: t._id.toString(),
        contact: contact
          ? {
              id: contact._id.toString(),
              name: contact.name,
              phone: contact.phone,
              optOut: contact.optOut,
            }
          : {
              id: t._id.toString(),
              name: 'Unknown Contact',
              phone: t.latestMessage?.phoneNumberId || '',
              optOut: false,
            },
        latestMessage: t.latestMessage,
        unreadCount: t.unreadCount,
        totalMessages: t.totalMessages,
      };
    });

    return populated;
  }

  // Get full timeline between business and contact
  async getMessages(organizationId: string, contactId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const contactObjId = new Types.ObjectId(contactId);

    return this.messageModel
      .find({ organizationId: orgObjId, contactId: contactObjId })
      .sort({ timestamp: 1 })
      .lean();
  }

  // Agent sends a direct reply in the live chat
  async reply(organizationId: string, contactId: string, text: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const contact = await this.contactModel.findOne({ _id: new Types.ObjectId(contactId), organizationId: orgObjId });
    if (!contact) throw new NotFoundException('Contact not found');

    if (contact.optOut) {
      throw new BadRequestException('Cannot message contact who has opted out');
    }

    return this.metaService.sendMessage(organizationId, {
      to: contact.phone,
      type: 'text',
      text: { body: text },
      contactId: contact._id.toString(),
    });
  }
}

