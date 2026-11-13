import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  checkHealth() {
    const isDbConnected = this.connection.readyState === 1;

    return {
      status: isDbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: isDbConnected ? 'up' : 'down',
          type: 'MongoDB',
        },
        queue: {
          status: 'up',
          mode: process.env.USE_IN_MEMORY_QUEUE === 'true' ? 'in-memory-worker' : 'bullmq-redis',
        },
        metaCloudApi: {
          status: 'configured',
          version: process.env.META_GRAPH_API_VERSION || 'v20.0',
        },
      },
    };
  }
}

