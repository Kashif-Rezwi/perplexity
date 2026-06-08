import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { OpenAiProviderService } from './openai-provider.service';

@Module({
  providers: [OpenAiProviderService, AiService],
  exports: [OpenAiProviderService, AiService],
})
export class AiModule {}
