import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@minigpt/contracts';
import { normalizeEmail, trimString } from '../../../common/normalize.ts';

export class RegisterDto {
  @ApiProperty({ example: 'ivan@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Ivan', minLength: 1, maxLength: 50 })
  @Transform(trimString)
  @IsString()
  @Length(1, 50)
  displayName!: string;

  // The password is NOT trimmed or changed in any way: spaces may be part of it.
  @ApiProperty({
    format: 'password',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
