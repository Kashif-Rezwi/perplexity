import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class BulkDeleteThreadsDto {
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;

    return Array.from(
      new Set(
        value.map((item) => (typeof item === 'string' ? item.trim() : item)),
      ),
    );
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsUUID(undefined, { each: true })
  threadIds!: string[];
}
