import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';

@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async findAll(@CurrentOrganization() orgId: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.templatesService.findAll(orgId);
  }

  @Post()
  async create(
    @CurrentOrganization() orgId: string,
    @Body()
    body: {
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
      buttons?: any[];
    },
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.templatesService.create(orgId, body);
  }

  @Get(':id')
  async findOne(@CurrentOrganization() orgId: string, @Param('id') id: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.templatesService.findOne(orgId, id);
  }

  @Post(':id/send-test')
  async sendTest(
    @CurrentOrganization() orgId: string,
    @Param('id') id: string,
    @Body()
    body: {
      recipientPhone: string;
      variables?: Record<string, string>;
      mediaUrl?: string;
    },
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    if (!body.recipientPhone) throw new BadRequestException('Recipient phone is required');
    return this.templatesService.sendTestMessage(
      orgId,
      id,
      body.recipientPhone,
      body.variables,
      body.mediaUrl,
    );
  }

  @Post('upload-media')
  async uploadMedia(
    @CurrentOrganization() orgId: string,
    @Body() body: { dataUrl: string; filename?: string; type?: string },
  ) {
    if (!body.dataUrl) throw new BadRequestException('Media data URL is required');
    // Return formatted media reference
    return {
      success: true,
      mediaUrl: body.dataUrl,
      type: body.type || 'image',
    };
  }
}
