import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { UserSchema } from './schemas/user.schema';
import { OrganizationSchema } from './schemas/organization.schema';
import { MembershipSchema, Role } from './schemas/membership.schema';
import { WhatsAppAccountSchema } from './schemas/whatsapp-account.schema';
import { PhoneNumberSchema } from './schemas/phone-number.schema';
import { TemplateSchema } from './schemas/template.schema';
import { ContactSchema } from './schemas/contact.schema';
import { CampaignSchema } from './schemas/campaign.schema';
import { CampaignRecipientSchema } from './schemas/campaign-recipient.schema';
import { MessageSchema } from './schemas/message.schema';
import { UsageRecordSchema } from './schemas/usage-record.schema';
import { InvoiceSchema } from './schemas/invoice.schema';
import { EncryptionUtil } from '../common/utils/encryption.util';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_saas';

async function seed() {
  console.log(`\n======================================================`);
  console.log(`Connecting to MongoDB at: ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log('MongoDB connected successfully!');

  const User = mongoose.model('User', UserSchema);
  const Organization = mongoose.model('Organization', OrganizationSchema);
  const Membership = mongoose.model('Membership', MembershipSchema);
  const WhatsAppAccount = mongoose.model('WhatsAppAccount', WhatsAppAccountSchema);
  const PhoneNumber = mongoose.model('PhoneNumber', PhoneNumberSchema);
  const Template = mongoose.model('Template', TemplateSchema);
  const Contact = mongoose.model('Contact', ContactSchema);
  const Campaign = mongoose.model('Campaign', CampaignSchema);
  const CampaignRecipient = mongoose.model('CampaignRecipient', CampaignRecipientSchema);
  const Message = mongoose.model('Message', MessageSchema);
  const UsageRecord = mongoose.model('UsageRecord', UsageRecordSchema);
  const Invoice = mongoose.model('Invoice', InvoiceSchema);

  // Clear existing collections
  console.log('Purging existing records for fresh clean database...');
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    Membership.deleteMany({}),
    WhatsAppAccount.deleteMany({}),
    PhoneNumber.deleteMany({}),
    Template.deleteMany({}),
    Contact.deleteMany({}),
    Campaign.deleteMany({}),
    CampaignRecipient.deleteMany({}),
    Message.deleteMany({}),
    UsageRecord.deleteMany({}),
    Invoice.deleteMany({}),
  ]);

  console.log('Seeding initial data...');

  // 1. Create Super Admin User
  const salt = await bcrypt.genSalt(10);
  const superAdminPassword = await bcrypt.hash('Admin@123456', salt);
  const superAdmin = await User.create({
    email: 'admin@platform.com',
    passwordHash: superAdminPassword,
    status: 'active',
    profile: {
      name: 'Platform Super Admin',
      phone: '+1 (800) 555-0199',
    },
    isSuperAdmin: true,
  });
  console.log(`✔ Super Admin created: admin@platform.com / Admin@123456`);

  // 2. Create Demo Client Organization
  const acmeOrg = await Organization.create({
    name: 'Acme Retail Inc.',
    status: 'active',
    plan: 'pro',
    settings: {
      monthlyQuota: 25000,
      currentMonthUsage: 1420,
      wabaConnected: true,
    },
  });
  console.log(`✔ Client Organization created: Acme Retail Inc. (ID: ${acmeOrg._id})`);

  // 3. Create Client Admin
  const clientAdminPassword = await bcrypt.hash('Client@123456', salt);
  const clientAdmin = await User.create({
    email: 'client@acme.com',
    passwordHash: clientAdminPassword,
    status: 'active',
    profile: {
      name: 'Sarah Jenkins (Acme Admin)',
      phone: '+1 (555) 432-8765',
    },
    isSuperAdmin: false,
  });

  await Membership.create({
    organizationId: acmeOrg._id,
    userId: clientAdmin._id,
    role: Role.CLIENT_ADMIN,
  });
  console.log(`✔ Client Admin created: client@acme.com / Client@123456`);

  // 4. Create Support Agent
  const agentPassword = await bcrypt.hash('Agent@123456', salt);
  const agentUser = await User.create({
    email: 'agent@acme.com',
    passwordHash: agentPassword,
    status: 'active',
    profile: {
      name: 'David Miller (Support Agent)',
      phone: '+1 (555) 789-0123',
    },
    isSuperAdmin: false,
  });

  await Membership.create({
    organizationId: acmeOrg._id,
    userId: agentUser._id,
    role: Role.AGENT,
  });
  console.log(`✔ Client Agent created: agent@acme.com / Agent@123456`);

  // Also give superAdmin a membership in AcmeOrg so they can test switching easily
  await Membership.create({
    organizationId: acmeOrg._id,
    userId: superAdmin._id,
    role: Role.SUPER_ADMIN,
  });

  // 5. Connect WhatsApp Business Account & Phone Number
  const encryptedToken = EncryptionUtil.encrypt('EAAGm0PXtest_waba_access_token_official_demo');
  const wabaAccount = await WhatsAppAccount.create({
    organizationId: acmeOrg._id,
    wabaId: '109849201948291',
    connectionStatus: 'connected',
    encryptedAccessToken: encryptedToken,
    verifiedName: 'Acme Retail Official',
    qualityRating: 'GREEN',
    rawMetaAccountData: {
      currency: 'USD',
      timezone_id: '1',
      status: 'VERIFIED',
    },
  });

  const phoneNumber = await PhoneNumber.create({
    organizationId: acmeOrg._id,
    whatsappAccountId: wabaAccount._id,
    phoneNumberId: '102938475610293',
    displayPhoneNumber: '+1 (555) 019-2834',
    verifiedName: 'Acme Retail Support',
    codeVerificationStatus: 'VERIFIED',
    qualityRating: 'GREEN',
    status: 'ACTIVE',
  });
  console.log(`✔ WhatsApp Business Account & Phone Number connected`);

  // 6. Create Approved WhatsApp Templates
  const templates = await Template.insertMany([
    {
      organizationId: acmeOrg._id,
      metaTemplateId: 'meta_tpl_order_confirm_01',
      name: 'order_confirmation',
      language: 'en_US',
      category: 'UTILITY',
      status: 'APPROVED',
      headerText: 'Order Confirmed!',
      bodyText: 'Hello {{1}}, thank you for shopping with Acme! Your order #{{2}} for {{3}} has been confirmed and is being packed.',
      footerText: 'Acme Retail Inc. • Reply HELP for assistance',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Confirmed!' },
        { type: 'BODY', text: 'Hello {{1}}, thank you for shopping with Acme! Your order #{{2}} for {{3}} has been confirmed.' },
        { type: 'FOOTER', text: 'Acme Retail Inc. • Reply HELP for assistance' },
      ],
    },
    {
      organizationId: acmeOrg._id,
      metaTemplateId: 'meta_tpl_flash_sale_02',
      name: 'summer_flash_sale',
      language: 'en_US',
      category: 'MARKETING',
      status: 'APPROVED',
      headerText: 'Special Summer Offer',
      bodyText: 'Hi {{1}}, don\'t miss out! Get 30% OFF everything in our summer collection using code SUMMER30 this weekend.',
      footerText: 'To unsubscribe, reply STOP',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Special Summer Offer' },
        { type: 'BODY', text: 'Hi {{1}}, don\'t miss out! Get 30% OFF using code SUMMER30.' },
        { type: 'FOOTER', text: 'To unsubscribe, reply STOP' },
      ],
    },
    {
      organizationId: acmeOrg._id,
      metaTemplateId: 'meta_tpl_delivery_03',
      name: 'delivery_update',
      language: 'en_US',
      category: 'UTILITY',
      status: 'APPROVED',
      headerText: 'Package On Its Way',
      bodyText: 'Good news {{1}}! Your package #{{2}} is out for delivery today with courier {{3}}.',
      footerText: 'Track live: acme.com/track',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Package On Its Way' },
        { type: 'BODY', text: 'Good news {{1}}! Your package #{{2}} is out for delivery today.' },
        { type: 'FOOTER', text: 'Track live: acme.com/track' },
      ],
    },
    {
      organizationId: acmeOrg._id,
      metaTemplateId: 'meta_tpl_auth_04',
      name: 'security_otp_code',
      language: 'en_US',
      category: 'AUTHENTICATION',
      status: 'APPROVED',
      headerText: '',
      bodyText: '{{1}} is your Acme verification code. For your security, do not share this code with anyone. Expires in 10 minutes.',
      footerText: 'Security Notice',
      components: [
        { type: 'BODY', text: '{{1}} is your Acme verification code.' },
        { type: 'FOOTER', text: 'Security Notice' },
      ],
    },
  ]);
  console.log(`✔ 4 Official WhatsApp templates created & approved`);

  // 7. Create Opted-In Contacts
  const contacts = await Contact.insertMany([
    {
      organizationId: acmeOrg._id,
      name: 'Alice Johnson',
      phone: '15552345678',
      email: 'alice.johnson@example.com',
      tags: ['vip', 'retail'],
      consentStatus: 'opted_in',
      consentSource: 'web_checkout',
      consentTimestamp: new Date('2026-01-15'),
      optOut: false,
    },
    {
      organizationId: acmeOrg._id,
      name: 'Bob Smith',
      phone: '15553456789',
      email: 'bob.smith@example.com',
      tags: ['retail', 'wholesale'],
      consentStatus: 'opted_in',
      consentSource: 'store_signup',
      consentTimestamp: new Date('2026-02-10'),
      optOut: false,
    },
    {
      organizationId: acmeOrg._id,
      name: 'Charlie Davis',
      phone: '15554567890',
      email: 'charlie.davis@example.com',
      tags: ['vip', 'lead'],
      consentStatus: 'opted_in',
      consentSource: 'lead_form',
      consentTimestamp: new Date('2026-03-01'),
      optOut: false,
    },
    {
      organizationId: acmeOrg._id,
      name: 'Diana Prince',
      phone: '15555678901',
      email: 'diana.prince@example.com',
      tags: ['retail'],
      consentStatus: 'opted_in',
      consentSource: 'inbound_message',
      consentTimestamp: new Date('2026-03-12'),
      optOut: false,
    },
    {
      organizationId: acmeOrg._id,
      name: 'Evan Wright',
      phone: '15556789012',
      email: 'evan.wright@example.com',
      tags: ['churned'],
      consentStatus: 'opted_out',
      consentSource: 'opt_out_reply',
      consentTimestamp: new Date('2026-01-01'),
      optOut: true,
      optOutTimestamp: new Date('2026-02-28'),
    },
  ]);
  console.log(`✔ 5 Contacts seeded with explicit consent and opt-out tracking`);

  // 8. Seed Live Messages and Conversations
  const now = Date.now();
  await Message.insertMany([
    // Conversation with Alice
    {
      organizationId: acmeOrg._id,
      contactId: contacts[0]._id,
      phoneNumberId: phoneNumber.phoneNumberId,
      metaMessageId: `wamid.HBgM${now - 3600000}001`,
      direction: 'outbound',
      type: 'template',
      content: 'Hello Alice, thank you for shopping with Acme! Your order #ACM-9821 has been confirmed.',
      templateName: 'order_confirmation',
      status: 'read',
      timestamp: new Date(now - 3600000),
    },
    {
      organizationId: acmeOrg._id,
      contactId: contacts[0]._id,
      phoneNumberId: phoneNumber.phoneNumberId,
      metaMessageId: `wamid.HBgM${now - 2400000}002`,
      direction: 'inbound',
      type: 'text',
      content: 'Hi! Can I change my delivery address to apartment 4B?',
      status: 'delivered',
      timestamp: new Date(now - 2400000),
    },
    {
      organizationId: acmeOrg._id,
      contactId: contacts[0]._id,
      phoneNumberId: phoneNumber.phoneNumberId,
      metaMessageId: `wamid.HBgM${now - 1200000}003`,
      direction: 'outbound',
      type: 'text',
      content: 'Hello Alice! Absolutely, I have updated your address to Apartment 4B. Your order is dispatching today!',
      status: 'delivered',
      timestamp: new Date(now - 1200000),
    },
    // Conversation with Bob
    {
      organizationId: acmeOrg._id,
      contactId: contacts[1]._id,
      phoneNumberId: phoneNumber.phoneNumberId,
      metaMessageId: `wamid.HBgM${now - 7200000}004`,
      direction: 'outbound',
      type: 'template',
      content: 'Hi Bob, don\'t miss out! Get 30% OFF using code SUMMER30.',
      templateName: 'summer_flash_sale',
      status: 'read',
      timestamp: new Date(now - 7200000),
    },
    {
      organizationId: acmeOrg._id,
      contactId: contacts[1]._id,
      phoneNumberId: phoneNumber.phoneNumberId,
      metaMessageId: `wamid.HBgM${now - 5000000}005`,
      direction: 'inbound',
      type: 'text',
      content: 'Thanks! Does the promo code apply to store pickups as well?',
      status: 'delivered',
      timestamp: new Date(now - 5000000),
    },
  ]);
  console.log(`✔ Sample two-way WhatsApp conversation history seeded`);

  // 9. Seed Sample Campaign
  const sampleCampaign = await Campaign.create({
    organizationId: acmeOrg._id,
    name: 'VIP Spring Exclusive Launch',
    templateId: templates[1]._id,
    audienceType: 'tags',
    targetTags: ['vip'],
    status: 'completed',
    counters: {
      total: 2,
      sent: 2,
      delivered: 2,
      read: 2,
      failed: 0,
    },
    scheduledAt: new Date(now - 86400000),
    completedAt: new Date(now - 86300000),
  });

  await CampaignRecipient.insertMany([
    {
      campaignId: sampleCampaign._id,
      organizationId: acmeOrg._id,
      contactId: contacts[0]._id,
      phone: contacts[0].phone,
      status: 'read',
      attempts: 1,
      metaMessageId: `wamid.HBgM${now - 86400000}C01`,
      sentAt: new Date(now - 86400000),
    },
    {
      campaignId: sampleCampaign._id,
      organizationId: acmeOrg._id,
      contactId: contacts[2]._id,
      phone: contacts[2].phone,
      status: 'read',
      attempts: 1,
      metaMessageId: `wamid.HBgM${now - 86400000}C02`,
      sentAt: new Date(now - 86400000),
    },
  ]);
  console.log(`✔ Sample campaign and recipient metrics seeded`);

  // 10. Seed Invoices & Usage Records
  await Invoice.create({
    organizationId: acmeOrg._id,
    invoiceNumber: 'INV-2026-0041',
    amount: 149.0,
    currency: 'USD',
    status: 'paid',
    dueDate: new Date(now - 15 * 86400000),
    paidAt: new Date(now - 14 * 86400000),
    items: [
      { description: 'Pro Plan Subscription (Monthly)', quantity: 1, unitPrice: 99.0, amount: 99.0 },
      { description: 'WhatsApp Marketing Conversations (1,200 msg)', quantity: 1200, unitPrice: 0.038, amount: 45.6 },
      { description: 'WhatsApp Utility Conversations (220 msg)', quantity: 220, unitPrice: 0.015, amount: 4.4 },
    ],
  });
  console.log(`✔ Billing invoices and usage records seeded`);

  console.log(`\n======================================================`);
  console.log(`DATABASE SEEDING COMPLETE!`);
  console.log(`------------------------------------------------------`);
  console.log(`Log in credentials:`);
  console.log(`Super Admin:  admin@platform.com  /  Admin@123456`);
  console.log(`Client Admin: client@acme.com     /  Client@123456`);
  console.log(`Client Agent: agent@acme.com      /  Agent@123456`);
  console.log(`======================================================\n`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

