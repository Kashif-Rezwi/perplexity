import { Module } from '@nestjs/common';
import { aiService } from './ai.service';

@Module({
  providers: [aiService],
  exports: [aiService],
})
export class AiModule { }
