import { Transform } from 'class-transformer';
import { IsUUID } from 'class-validator';

export class RetryAskRequestDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsUUID()
  threadId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsUUID()
  turnId!: string;
}
