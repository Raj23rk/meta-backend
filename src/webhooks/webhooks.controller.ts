import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // Meta Webhook Verification endpoint (GET /api/webhooks/whatsapp)
  @Get('whatsapp')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifiedChallenge = this.webhooksService.verifyChallenge(mode, token, challenge);
    if (verifiedChallenge) {
      return res.status(HttpStatus.OK).send(verifiedChallenge);
    }
    return res.status(HttpStatus.FORBIDDEN).send('Verification failed');
  }

  // Meta Inbound Webhook Event handler (POST /api/webhooks/whatsapp)
  @Post('whatsapp')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    await this.webhooksService.processEvent(payload);
    return { status: 'EVENT_RECEIVED' };
  }

  // Built-in webhook simulation endpoint for dev testing & UI simulators
  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  async simulateWebhook(@Body() body: {
    eventType: 'delivered' | 'read' | 'failed' | 'inbound_reply';
    metaMessageId?: string;
    senderPhone?: string;
    replyText?: string;
  }) {
    return this.webhooksService.simulateWebhookEvent(body);
  }
}

