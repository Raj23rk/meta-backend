import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';

@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  async findAll(@CurrentOrganization() orgId: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.campaignsService.findAll(orgId);
  }

  @Post()
  async create(
    @CurrentOrganization() orgId: string,
    @Body() body: {
      name: string;
      templateId: string;
      audienceType: 'all' | 'tags';
      targetTags?: string[];
    },
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.campaignsService.create(orgId, body);
  }

  @Get(':id')
  async findOne(@CurrentOrganization() orgId: string, @Param('id') id: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.campaignsService.findOne(orgId, id);
  }

  @Post(':id/start')
  async start(@CurrentOrganization() orgId: string, @Param('id') id: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.campaignsService.start(orgId, id);
  }

  @Post(':id/pause')
  async pause(@CurrentOrganization() orgId: string, @Param('id') id: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.campaignsService.pause(orgId, id);
  }

  @Post(':id/resume')
  async resume(@CurrentOrganization() orgId: string, @Param('id') id: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.campaignsService.resume(orgId, id);
  }

  @Post(':id/cancel')
  async cancel(@CurrentOrganization() orgId: string, @Param('id') id: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.campaignsService.cancel(orgId, id);
  }
}

