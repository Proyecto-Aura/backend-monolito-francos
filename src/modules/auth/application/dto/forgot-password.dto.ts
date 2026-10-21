import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ana.torres@gmail.com', maxLength: 150 })
  @IsEmail()
  @MaxLength(150)
  email!: string;
}
