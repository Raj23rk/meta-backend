import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { Role } from '../database/schemas/membership.schema';

@UseGuards(JwtAuthGuard)
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  async getMembers(@CurrentOrganization() orgId: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.membershipsService.findByOrganization(orgId);
  }

  @Post()
  async addMember(
    @CurrentOrganization() orgId: string,
    @Body() body: { email: string; name: string; role: Role; password?: string },
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.membershipsService.addMember(orgId, body);
  }

  @Delete(':id')
  async removeMember(
    @CurrentOrganization() orgId: string,
    @Param('id') id: string,
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.membershipsService.removeMember(orgId, id);
  }
}

