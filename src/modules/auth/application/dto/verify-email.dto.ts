import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'token-de-verificacion' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token!: string;
}
