import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Get()
  async findAll(@CurrentUser() user: any): Promise<any[]> {
    return this.orgService.findAll();
  }

  @Post()
  async create(@Body() body: { name: string; plan?: string; monthlyQuota?: number }) {
    return this.orgService.create(body);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orgService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.orgService.update(id, body);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.orgService.getStats(id);
  }
}

