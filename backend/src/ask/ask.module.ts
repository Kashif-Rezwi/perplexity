import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AskService } from './ask.service';

@Module({
  imports: [AiModule],
  providers: [AskService],
  exports: [AskService],
})
export class AskModule {}
