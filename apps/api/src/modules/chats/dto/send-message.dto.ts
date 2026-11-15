import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { MESSAGE_MAX_LENGTH } from '@minigpt/contracts';
import { trimString } from '../../../common/normalize.ts';

export class SendMessageDto {
  @ApiProperty({ example: 'Explain what a neural network is', maxLength: MESSAGE_MAX_LENGTH })
  @Transform(trimString)
  @IsString()
  @Length(1, MESSAGE_MAX_LENGTH) // after trimming: a message of spaces is empty
  content!: string;
}
