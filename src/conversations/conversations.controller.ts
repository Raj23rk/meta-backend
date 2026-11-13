import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async getConversations(@CurrentOrganization() orgId: string) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.conversationsService.getConversations(orgId);
  }

  @Get(':contactId/messages')
  async getMessages(
    @CurrentOrganization() orgId: string,
    @Param('contactId') contactId: string,
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    return this.conversationsService.getMessages(orgId, contactId);
  }

  @Post(':contactId/reply')
  async reply(
    @CurrentOrganization() orgId: string,
    @Param('contactId') contactId: string,
    @Body() body: { text: string },
  ) {
    if (!orgId) throw new BadRequestException('Organization ID header missing');
    if (!body.text || !body.text.trim()) {
      throw new BadRequestException('Message text cannot be empty');
    }
    return this.conversationsService.reply(orgId, contactId, body.text);
  }
}

