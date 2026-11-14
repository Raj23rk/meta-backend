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

@Controller(['webhooks', 'whatsapp', 'v1/whatsapp'])
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // Meta Webhook Verification endpoint
  // Matches:
  // - GET /api/webhooks/whatsapp
  // - GET /api/whatsapp/webhook
  // - GET /api/v1/whatsapp/webhook
  @Get(['whatsapp', 'webhook'])
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

  // Meta Inbound Webhook Event handler
  // Matches:
  // - POST /api/webhooks/whatsapp
  // - POST /api/whatsapp/webhook
  // - POST /api/v1/whatsapp/webhook
  @Post(['whatsapp', 'webhook'])
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

