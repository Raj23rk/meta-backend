import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Template, TemplateDocument } from '../database/schemas/template.schema';
import { MetaService } from '../meta/meta.service';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectModel(Template.name) private templateModel: Model<TemplateDocument>,
    private readonly metaService: MetaService,
  ) {}

  async findAll(organizationId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    return this.templateModel.find({ organizationId: orgObjId }).sort({ createdAt: -1 });
  }

  async findOne(organizationId: string, id: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const template = await this.templateModel.findOne({ _id: new Types.ObjectId(id), organizationId: orgObjId });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async create(organizationId: string, data: {
    name: string;
    language?: string;
    languages?: string[];
    category: string;
    subCategory?: string;
    headerType?: string;
    headerText?: string;
    headerMediaUrl?: string;
    bodyText: string;
    footerText?: string;
    buttons?: Array<{
      type: string;
      text: string;
      url?: string;
      phoneNumber?: string;
    }>;
  }) {
    const orgObjId = new Types.ObjectId(organizationId);
    const cleanName = data.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const components: any[] = [];

    // Header component
    const headerType = (data.headerType || 'NONE').toUpperCase();
    if (headerType === 'TEXT' && data.headerText) {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: data.headerText,
      });
    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
      components.push({
        type: 'HEADER',
        format: headerType,
        example: data.headerMediaUrl ? { header_handle: [data.headerMediaUrl] } : undefined,
      });
    } else if (headerType === 'LOCATION') {
      components.push({
        type: 'HEADER',
        format: 'LOCATION',
      });
    }

    // Body component
    components.push({
      type: 'BODY',
      text: data.bodyText,
    });

    // Footer component
    if (data.footerText) {
      components.push({
        type: 'FOOTER',
        text: data.footerText,
      });
    }

    // Buttons component
    if (data.buttons && data.buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: data.buttons.map((b) => {
          if (b.type === 'URL') {
            return { type: 'URL', text: b.text, url: b.url };
          }
          if (b.type === 'PHONE_NUMBER') {
            return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phoneNumber };
          }
          if (b.type === 'QUICK_REPLY') {
            return { type: 'QUICK_REPLY', text: b.text };
          }
          if (b.type === 'OPT_OUT') {
            return { type: 'QUICK_REPLY', text: 'STOP' };
          }
          return { type: 'QUICK_REPLY', text: b.text };
        }),
      });
    }

    const template = await this.templateModel.create({
      organizationId: orgObjId,
      metaTemplateId: `meta_tpl_${Date.now()}`,
      name: cleanName,
      language: data.language || 'en_US',
      languages: data.languages || [data.language || 'en_US'],
      category: data.category,
      subCategory: data.subCategory || 'CUSTOM',
      status: 'APPROVED',
      headerType,
      headerText: data.headerText || '',
      headerMediaUrl: data.headerMediaUrl || '',
      bodyText: data.bodyText,
      footerText: data.footerText || '',
      buttons: data.buttons || [],
      components,
    });

    return template;
  }

  async sendTestMessage(
    organizationId: string,
    templateId: string,
    testRecipientPhone: string,
    variables: Record<string, string> = {},
    mediaUrl?: string,
  ) {
    const template = await this.findOne(organizationId, templateId);

    // Format components for Meta Cloud API
    const parameters: any[] = [];
    Object.keys(variables).forEach((key) => {
      parameters.push({
        type: 'text',
        text: variables[key],
      });
    });

    const components: any[] = [];

    // If template has image/video/document header
    const activeMedia = mediaUrl || template.headerMediaUrl;
    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(template.headerType) && activeMedia) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: template.headerType.toLowerCase(),
            [template.headerType.toLowerCase()]: {
              link: activeMedia,
            },
          },
        ],
      });
    }

    if (parameters.length > 0) {
      components.push({
        type: 'body',
        parameters,
      });
    }

    return this.metaService.sendMessage(organizationId, {
      to: testRecipientPhone,
      type: 'template',
      template: {
        name: template.name,
        language: { code: template.language },
        components: components.length > 0 ? components : undefined,
      },
    });
  }
}
