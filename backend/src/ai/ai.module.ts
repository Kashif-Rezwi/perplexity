import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AiService } from './ai.service';

@Module({
  providers: [LlmService, AiService],
  exports: [LlmService, AiService],
})
export class AiModule { }
