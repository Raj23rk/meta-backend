import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { Template, TemplateSchema } from '../database/schemas/template.schema';
import { MetaModule } from '../meta/meta.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Template.name, schema: TemplateSchema }]),
    MetaModule,
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}

