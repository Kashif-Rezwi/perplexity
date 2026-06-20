import { IsBoolean } from 'class-validator';

export class TogglePinDto {
  @IsBoolean()
  isPinned!: boolean;
}
