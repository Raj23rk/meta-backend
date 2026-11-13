import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  async findAll(
    @CurrentOrganization() orgId: string,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
    @Query('group') group?: string,
    @Query('consent') consent?: string,
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.contactsService.findAll(orgId, { search, tag, group, consent });
  }

  @Get('tags')
  async getTags(@CurrentOrganization() orgId: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.contactsService.getTags(orgId);
  }

  @Get('groups')
  async getGroups(@CurrentOrganization() orgId: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.contactsService.getGroups(orgId);
  }

  @Get('segments')
  async getSegments(@CurrentOrganization() orgId: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.contactsService.getSegments(orgId);
  }

  @Post('segments/preview')
  async previewSegment(
    @CurrentOrganization() orgId: string,
    @Body() body: { filters: Array<{ field: string; attribute: string; value: string }> },
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.contactsService.previewSegment(orgId, body.filters || []);
  }

  @Post('segments')
  async createSegment(
    @CurrentOrganization() orgId: string,
    @Body() body: { name: string; filters: Array<{ field: string; attribute: string; value: string }> },
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.contactsService.createSegment(orgId, body);
  }

  @Delete('segments/:id')
  async deleteSegment(@CurrentOrganization() orgId: string, @Param('id') id: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.contactsService.deleteSegment(orgId, id);
  }

  @Post()
  async create(
    @CurrentOrganization() orgId: string,
    @Body() body: {
      name: string;
      phone: string;
      email?: string;
      tags?: string[];
      group?: string;
      consentStatus?: string;
      consentSource?: string;
    },
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.contactsService.create(orgId, body);
  }

  @Post('bulk-import')
  async bulkImport(
    @CurrentOrganization() orgId: string,
    @Body() body: {
      contacts: Array<{
        name?: string;
        phone: string;
        email?: string;
        tags?: string[];
        group?: string;
        consentSource?: string;
      }>;
    },
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    if (!body.contacts || !Array.isArray(body.contacts)) {
      throw new BadRequestException('Contacts array is required');
    }
    return this.contactsService.importBulk(orgId, body.contacts);
  }

  @Patch(':id/toggle-opt-out')
  async toggleOptOut(@CurrentOrganization() orgId: string, @Param('id') id: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.contactsService.toggleOptOut(orgId, id);
  }
}
