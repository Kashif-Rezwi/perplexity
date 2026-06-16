import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { OpenAiProviderService } from './openai-provider.service';
import { GroqProviderService } from './groq-provider.service';

@Module({
  providers: [OpenAiProviderService, GroqProviderService, AiService],
  exports: [AiService],
})
export class AiModule {}
