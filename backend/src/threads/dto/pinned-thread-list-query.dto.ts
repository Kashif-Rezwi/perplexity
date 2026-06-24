import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PinnedThreadListQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? Number(value.trim()) : value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
