import { IsUUID } from 'class-validator';

export class ThreadParamsDto {
  @IsUUID()
  threadId!: string;
}
