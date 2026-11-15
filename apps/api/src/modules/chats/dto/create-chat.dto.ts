import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';
import { CHAT_TITLE_MAX_LENGTH } from '@minigpt/contracts';
import { trimString } from '../../../common/normalize.ts';

export class CreateChatDto {
  @ApiPropertyOptional({ example: 'Trip planning', maxLength: CHAT_TITLE_MAX_LENGTH })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(1, CHAT_TITLE_MAX_LENGTH)
  title?: string;
}
