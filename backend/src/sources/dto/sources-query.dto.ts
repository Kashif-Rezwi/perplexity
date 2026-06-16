import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class SourcesQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? Number(value.trim()) : value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsUUID()
  turnId?: string;
}
