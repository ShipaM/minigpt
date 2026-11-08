import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateUserDto {
  @ApiProperty({ example: 'ivan@example.com' })
  @Transform(({ value }) => {
    const v = trim({ value });
    return typeof v === 'string' ? v.toLowerCase() : v;
  })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Ivan', minLength: 1, maxLength: 50 })
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  displayName!: string;
}
