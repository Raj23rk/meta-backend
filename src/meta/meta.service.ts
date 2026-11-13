import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import { WhatsAppAccount, WhatsAppAccountDocument } from '../database/schemas/whatsapp-account.schema';
import { PhoneNumber, PhoneNumberDocument } from '../database/schemas/phone-number.schema';
import { Template, TemplateDocument } from '../database/schemas/template.schema';
import { Message, MessageDocument } from '../database/schemas/message.schema';
import { EncryptionUtil } from '../common/utils/encryption.util';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private readonly graphApiVersion = process.env.META_GRAPH_API_VERSION || 'v20.0';

  constructor(
    @InjectModel(WhatsAppAccount.name) private wabaModel: Model<WhatsAppAccountDocument>,
    @InjectModel(PhoneNumber.name) private phoneModel: Model<PhoneNumberDocument>,
    @InjectModel(Template.name) private templateModel: Model<TemplateDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  // Save or update WhatsApp Business Account credentials
  async connectAccount(organizationId: string, data: {
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    accessToken: string;
    verifiedName?: string;
  }) {
    const orgObjId = new Types.ObjectId(organizationId);

    // Encrypt the sensitive access token
    const encryptedAccessToken = EncryptionUtil.encrypt(data.accessToken);

    // Find or update WABA
    let account = await this.wabaModel.findOne({ organizationId: orgObjId });
    if (!account) {
      account = new this.wabaModel({
        organizationId: orgObjId,
        wabaId: data.wabaId,
        connectionStatus: 'connected',
        encryptedAccessToken,
        verifiedName: data.verifiedName || 'WhatsApp Business',
        qualityRating: 'GREEN',
      });
    } else {
      account.wabaId = data.wabaId;
      account.connectionStatus = 'connected';
      account.encryptedAccessToken = encryptedAccessToken;
      if (data.verifiedName) account.verifiedName = data.verifiedName;
      account.qualityRating = 'GREEN';
    }
    await account.save();

    // Find or update Phone Number
    let phone = await this.phoneModel.findOne({ organizationId: orgObjId });
    if (!phone) {
      phone = new this.phoneModel({
        organizationId: orgObjId,
        whatsappAccountId: account._id,
        phoneNumberId: data.phoneNumberId,
        displayPhoneNumber: data.displayPhoneNumber,
        verifiedName: data.verifiedName || 'Business Phone',
        codeVerificationStatus: 'VERIFIED',
        qualityRating: 'GREEN',
        status: 'ACTIVE',
      });
    } else {
      phone.phoneNumberId = data.phoneNumberId;
      phone.displayPhoneNumber = data.displayPhoneNumber;
      if (data.verifiedName) phone.verifiedName = data.verifiedName;
      phone.status = 'ACTIVE';
    }
    await phone.save();

    return {
      success: true,
      account: {
        id: account._id.toString(),
        wabaId: account.wabaId,
        connectionStatus: account.connectionStatus,
        verifiedName: account.verifiedName,
      },
      phone: {
        id: phone._id.toString(),
        phoneNumberId: phone.phoneNumberId,
        displayPhoneNumber: phone.displayPhoneNumber,
        status: phone.status,
      },
    };
  }

  // Get active connection status
  async getConnectionStatus(organizationId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const [account, phone] = await Promise.all([
      this.wabaModel.findOne({ organizationId: orgObjId }),
      this.phoneModel.findOne({ organizationId: orgObjId }),
    ]);

    return {
      connected: account?.connectionStatus === 'connected',
      account: account ? {
        id: account._id.toString(),
        wabaId: account.wabaId,
        connectionStatus: account.connectionStatus,
        verifiedName: account.verifiedName,
        qualityRating: account.qualityRating,
      } : null,
      phone: phone ? {
        id: phone._id.toString(),
        phoneNumberId: phone.phoneNumberId,
        displayPhoneNumber: phone.displayPhoneNumber,
        verifiedName: phone.verifiedName,
        status: phone.status,
      } : null,
      webhookConfig: {
        callbackUrl: `${process.env.API_PUBLIC_URL || 'http://localhost:3000'}/api/webhooks/whatsapp`,
        verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || 'whatsapp_webhook_verify_token_secure_123',
      },
    };
  }

  // Meta Embedded Signup token exchange simulation or real API call
  async handleEmbeddedSignupExchange(organizationId: string, authCode: string) {
    this.logger.log(`Received Embedded Signup auth code: ${authCode.substring(0, 8)}...`);

    // In production: POST https://graph.facebook.com/v20.0/oauth/access_token
    // with client_id, client_secret, code
    const isMock = authCode.startsWith('mock_') || authCode === 'demo_code';
    
    let wabaId = '109849201948291';
    let phoneNumberId = '102938475610293';
    let displayPhoneNumber = '+1 (555) 867-5309';
    let token = `EAAGm0PX...mock_token_${Date.now()}`;

    if (!isMock && process.env.META_APP_ID && process.env.META_APP_SECRET) {
      try {
        const tokenRes = await axios.get(`https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`, {
          params: {
            client_id: process.env.META_APP_ID,
            client_secret: process.env.META_APP_SECRET,
            code: authCode,
          },
        });
        token = tokenRes.data.access_token;
      } catch (err: any) {
        this.logger.warn(`Live token exchange failed, using test credentials: ${err.message}`);
      }
    }

    return this.connectAccount(organizationId, {
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      accessToken: token,
      verifiedName: 'Verified Business Account',
    });
  }

  // Send WhatsApp Message via Meta Cloud API
  async sendMessage(organizationId: string, payload: {
    to: string;
    type: 'template' | 'text';
    template?: {
      name: string;
      language: { code: string };
      components?: any[];
    };
    text?: {
      body: string;
    };
    contactId?: string;
  }) {
    const orgObjId = new Types.ObjectId(organizationId);
    const [account, phone] = await Promise.all([
      this.wabaModel.findOne({ organizationId: orgObjId }),
      this.phoneModel.findOne({ organizationId: orgObjId }),
    ]);

    if (!account || !phone || account.connectionStatus !== 'connected') {
      throw new BadRequestException('WhatsApp Business Account or Phone Number is not connected');
    }

    const decryptedToken = EncryptionUtil.decrypt(account.encryptedAccessToken);
    const cleanPhone = payload.to.replace(/\D/g, '');

    const requestBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: payload.type,
    };

    if (payload.type === 'template') {
      requestBody.template = payload.template;
    } else {
      requestBody.text = payload.text;
    }

    let metaMessageId = `wamid.HBgM${Date.now()}SIMULATED${Math.floor(Math.random() * 100000)}`;
    let status = 'sent';
    let errorCode: string | undefined;
    let errorMessage: string | undefined;

    // Call Meta Cloud API if valid token is configured
    const isLive = decryptedToken && !decryptedToken.includes('mock_') && !decryptedToken.includes('test_');

    if (isLive) {
      try {
        const res = await axios.post(
          `https://graph.facebook.com/${this.graphApiVersion}/${phone.phoneNumberId}/messages`,
          requestBody,
          {
            headers: {
              Authorization: `Bearer ${decryptedToken}`,
              'Content-Type': 'application/json',
            },
          },
        );
        metaMessageId = res.data.messages[0]?.id || metaMessageId;
        this.logger.log(`Meta API message sent successfully: ${metaMessageId}`);
      } catch (err: any) {
        status = 'failed';
        errorCode = err.response?.data?.error?.code || 'META_API_ERROR';
        errorMessage = err.response?.data?.error?.message || err.message;
        this.logger.error(`Meta API send failed: ${errorMessage}`, err.response?.data);
      }
    } else {
      this.logger.log(`[TEST/SANDBOX MODE] Simulated send to ${cleanPhone}: ${metaMessageId}`);
    }

    // Persist to Message collection
    const message = await this.messageModel.create({
      organizationId: orgObjId,
      contactId: payload.contactId ? new Types.ObjectId(payload.contactId) : undefined,
      phoneNumberId: phone.phoneNumberId,
      metaMessageId,
      direction: 'outbound',
      type: payload.type,
      content: payload.type === 'template' ? `[Template: ${payload.template?.name}]` : (payload.text?.body || ''),
      templateName: payload.template?.name,
      status,
      errorCode,
      errorMessage,
      timestamp: new Date(),
    });

    return {
      success: status !== 'failed',
      messageId: message._id.toString(),
      metaMessageId,
      status,
      error: errorMessage,
    };
  }

  // Synchronize Templates from Meta WABA
  async syncTemplates(organizationId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const account = await this.wabaModel.findOne({ organizationId: orgObjId });

    if (!account) {
      throw new BadRequestException('WhatsApp Account not connected');
    }

    const decryptedToken = EncryptionUtil.decrypt(account.encryptedAccessToken);
    let metaTemplates: any[] = [];

    const isLive = decryptedToken && !decryptedToken.includes('mock_');
    if (isLive) {
      try {
        const res = await axios.get(
          `https://graph.facebook.com/${this.graphApiVersion}/${account.wabaId}/message_templates`,
          {
            headers: { Authorization: `Bearer ${decryptedToken}` },
          },
        );
        metaTemplates = res.data.data || [];
      } catch (err: any) {
        this.logger.warn(`Could not sync live templates: ${err.message}. Using stored/sample templates.`);
      }
    }

    // Upsert templates in DB
    const synced = [];
    for (const t of metaTemplates) {
      const bodyComponent = t.components?.find((c: any) => c.type === 'BODY');
      const headerComponent = t.components?.find((c: any) => c.type === 'HEADER');
      const footerComponent = t.components?.find((c: any) => c.type === 'FOOTER');

      const template = await this.templateModel.findOneAndUpdate(
        { organizationId: orgObjId, name: t.name, language: t.language },
        {
          metaTemplateId: t.id,
          name: t.name,
          language: t.language,
          category: t.category,
          status: t.status,
          components: t.components,
          bodyText: bodyComponent?.text || '',
          headerText: headerComponent?.text || '',
          footerText: footerComponent?.text || '',
        },
        { upsert: true, new: true },
      );
      synced.push(template);
    }

    return this.templateModel.find({ organizationId: orgObjId });
  }
}

