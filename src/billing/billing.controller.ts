import { Controller, Get, UseGuards, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';

@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('summary')
  async getSummary(@CurrentOrganization() orgId: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.billingService.getBillingSummary(orgId);
  }
}

