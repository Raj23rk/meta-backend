import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contact, ContactDocument } from '../database/schemas/contact.schema';
import { Segment, SegmentDocument } from '../database/schemas/segment.schema';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @InjectModel(Segment.name) private segmentModel: Model<SegmentDocument>,
  ) {}

  async findAll(organizationId: string, query: { search?: string; tag?: string; group?: string; consent?: string }) {
    const orgObjId = new Types.ObjectId(organizationId);
    const filter: any = { organizationId: orgObjId };

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { tags: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.tag) {
      filter.tags = query.tag;
    }

    if (query.group) {
      filter.group = query.group;
    }

    if (query.consent) {
      filter.consentStatus = query.consent;
    }

    return this.contactModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getTags(organizationId: string): Promise<string[]> {
    const orgObjId = new Types.ObjectId(organizationId);
    const tags = await this.contactModel.distinct('tags', { organizationId: orgObjId });
    return (tags || []).filter(Boolean).sort();
  }

  async getGroups(organizationId: string): Promise<Array<{ name: string; count: number }>> {
    const orgObjId = new Types.ObjectId(organizationId);
    const groups = await this.contactModel.aggregate([
      { $match: { organizationId: orgObjId, group: { $exists: true, $ne: '' } } },
      { $group: { _id: '$group', count: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', count: 1 } },
      { $sort: { name: 1 } },
    ]);
    return groups;
  }

  async getSegments(organizationId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    return this.segmentModel.find({ organizationId: orgObjId }).sort({ createdAt: -1 }).lean();
  }

  private buildFilterQuery(organizationId: string, filters: Array<{ field: string; attribute: string; value: string }>) {
    const orgObjId = new Types.ObjectId(organizationId);
    const query: any = { organizationId: orgObjId };

    if (!filters || filters.length === 0) return query;

    for (const f of filters) {
      if (!f.field || !f.value) continue;
      const field = f.field.toLowerCase().trim();
      const val = f.value.trim();
      const attr = (f.attribute || 'is').toLowerCase().trim();

      if (field === 'tags' || field === 'tag') {
        if (attr === 'is' || attr === 'equals') {
          query.tags = val;
        } else if (attr === 'contains') {
          query.tags = { $regex: val, $options: 'i' };
        }
      } else if (field === 'group') {
        if (attr === 'is' || attr === 'equals') {
          query.group = val;
        } else if (attr === 'contains') {
          query.group = { $regex: val, $options: 'i' };
        }
      } else if (field === 'name') {
        query.name = attr === 'contains' ? { $regex: val, $options: 'i' } : val;
      } else if (field === 'consent' || field === 'consentstatus') {
        query.consentStatus = val.toLowerCase();
      }
    }

    return query;
  }

  async previewSegment(organizationId: string, filters: Array<{ field: string; attribute: string; value: string }>) {
    const query = this.buildFilterQuery(organizationId, filters);
    const count = await this.contactModel.countDocuments(query);
    return { count };
  }

  async createSegment(
    organizationId: string,
    data: { name: string; filters: Array<{ field: string; attribute: string; value: string }> },
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    if (!data.name?.trim()) throw new BadRequestException('Segment name is required');

    const query = this.buildFilterQuery(organizationId, data.filters || []);
    const count = await this.contactModel.countDocuments(query);

    return this.segmentModel.create({
      organizationId: orgObjId,
      name: data.name.trim(),
      filters: data.filters || [],
      contactCount: count,
    });
  }

  async deleteSegment(organizationId: string, segmentId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    return this.segmentModel.findOneAndDelete({ _id: new Types.ObjectId(segmentId), organizationId: orgObjId });
  }

  async findOne(organizationId: string, id: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const contact = await this.contactModel.findOne({ _id: new Types.ObjectId(id), organizationId: orgObjId });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(organizationId: string, data: {
    name: string;
    phone: string;
    email?: string;
    tags?: string[];
    group?: string;
    consentStatus?: string;
    consentSource?: string;
  }) {
    const orgObjId = new Types.ObjectId(organizationId);
    const cleanPhone = data.phone.replace(/\D/g, '');

    const existing = await this.contactModel.findOne({ organizationId: orgObjId, phone: cleanPhone });
    if (existing) {
      throw new ConflictException(`Contact with phone number ${cleanPhone} already exists`);
    }

    return this.contactModel.create({
      organizationId: orgObjId,
      name: data.name,
      phone: cleanPhone,
      email: data.email,
      tags: data.tags || [],
      group: data.group || '',
      consentStatus: data.consentStatus || 'opted_in',
      consentSource: data.consentSource || 'manual_entry',
      consentTimestamp: new Date(),
      optOut: data.consentStatus === 'opted_out',
    });
  }

  async importBulk(organizationId: string, items: Array<{
    name?: string;
    phone: string;
    email?: string;
    tags?: string[];
    group?: string;
    consentSource?: string;
  }>) {
    const orgObjId = new Types.ObjectId(organizationId);
    let imported = 0;
    let skipped = 0;

    if (!items || items.length === 0) {
      return { imported: 0, skipped: 0, total: 0 };
    }

    // Process in batches with bulkWrite for high-speed import of 1,000+ contacts
    const batchSize = 250;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const bulkOps: any[] = [];

      for (const item of batch) {
        if (!item.phone) {
          skipped++;
          continue;
        }

        // Clean phone numbers: handle float .0, strip non-digits
        let rawPhone = String(item.phone).replace(/\.0+$/, '').trim();
        const cleanPhone = rawPhone.replace(/\D/g, '');

        if (!cleanPhone || cleanPhone.length < 8) {
          skipped++;
          continue;
        }

        const tags = Array.isArray(item.tags)
          ? item.tags.filter(Boolean)
          : item.tags
          ? [String(item.tags).trim()]
          : ['imported'];

        bulkOps.push({
          updateOne: {
            filter: { organizationId: orgObjId, phone: cleanPhone },
            update: {
              $setOnInsert: {
                organizationId: orgObjId,
                phone: cleanPhone,
                consentTimestamp: new Date(),
                optOut: false,
                consentStatus: 'opted_in',
              },
              $set: {
                name: item.name?.trim() || `Contact ${cleanPhone.slice(-4)}`,
                email: item.email?.trim() || '',
                group: item.group?.trim() || '',
                consentSource: item.consentSource || 'csv_import',
              },
              $addToSet: {
                tags: { $each: tags },
              },
            },
            upsert: true,
          },
        });
      }

      if (bulkOps.length > 0) {
        try {
          const res = await this.contactModel.bulkWrite(bulkOps, { ordered: false });
          imported += (res.upsertedCount || 0) + (res.modifiedCount || 0);
        } catch (err: any) {
          // If duplicate key error on some, count successful upserts
          if (err.result) {
            imported += (err.result.nUpserted || 0) + (err.result.nModified || 0);
          }
        }
      }
    }

    return { imported, skipped, total: items.length };
  }

  async toggleOptOut(organizationId: string, id: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const contact = await this.contactModel.findOne({ _id: new Types.ObjectId(id), organizationId: orgObjId });
    if (!contact) throw new NotFoundException('Contact not found');

    contact.optOut = !contact.optOut;
    contact.consentStatus = contact.optOut ? 'opted_out' : 'opted_in';
    contact.optOutTimestamp = contact.optOut ? new Date() : undefined;
    await contact.save();

    return contact;
  }
}
