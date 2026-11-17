import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({ example: 'ana@francos.test', maxLength: 150 })
  @IsEmail()
  @MaxLength(150)
  email!: string;
}
