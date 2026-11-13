import { Controller, Post, Get, Body, UseGuards, Headers, BadRequestException } from '@nestjs/common';
import { MetaService } from './meta.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';

@UseGuards(JwtAuthGuard)
@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get('status')
  async getStatus(@CurrentOrganization() orgId: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.metaService.getConnectionStatus(orgId);
  }

  @Post('connect')
  async connectAccount(
    @CurrentOrganization() orgId: string,
    @Body() body: {
      wabaId: string;
      phoneNumberId: string;
      displayPhoneNumber: string;
      accessToken: string;
      verifiedName?: string;
    },
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.metaService.connectAccount(orgId, body);
  }

  @Post('embedded-signup/exchange')
  async handleEmbeddedSignup(
    @CurrentOrganization() orgId: string,
    @Body() body: { code: string },
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.metaService.handleEmbeddedSignupExchange(orgId, body.code);
  }

  @Post('sync-templates')
  async syncTemplates(@CurrentOrganization() orgId: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.metaService.syncTemplates(orgId);
  }

  @Post('send-test')
  async sendTestMessage(
    @CurrentOrganization() orgId: string,
    @Body() body: {
      to: string;
      type: 'template' | 'text';
      template?: any;
      text?: any;
    },
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.metaService.sendMessage(orgId, body);
  }
}

