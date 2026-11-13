import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { MembershipsModule } from './memberships/memberships.module';
import { MetaModule } from './meta/meta.module';
import { TemplatesModule } from './templates/templates.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ContactsModule } from './contacts/contacts.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { QueuesModule } from './queues/queues.module';
import { ConversationsModule } from './conversations/conversations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BillingModule } from './billing/billing.module';
import { HealthModule } from './health/health.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_saas'),
    AuthModule,
    OrganizationsModule,
    MembershipsModule,
    MetaModule,
    TemplatesModule,
    WebhooksModule,
    ContactsModule,
    CampaignsModule,
    QueuesModule,
    ConversationsModule,
    AnalyticsModule,
    BillingModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

