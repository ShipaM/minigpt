import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { CHAT_TITLE_MAX_LENGTH } from '@minigpt/contracts';
import { trimString } from '../../../common/normalize.ts';

export class RenameChatDto {
  @ApiProperty({ example: 'Trip planning', maxLength: CHAT_TITLE_MAX_LENGTH })
  @Transform(trimString)
  @IsString()
  @Length(1, CHAT_TITLE_MAX_LENGTH)
  title!: string;
}
