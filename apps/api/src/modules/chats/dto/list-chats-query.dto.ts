import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CHATS_PAGE_MAX } from '@minigpt/contracts';

// Query string of GET /chats. Values arrive as text: `@Type` turns `limit` into a number before validation.
export class ListChatsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: CHATS_PAGE_MAX })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CHATS_PAGE_MAX)
  limit?: number;

  @ApiPropertyOptional({ description: 'The nextCursor value of the previous page' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;
}
