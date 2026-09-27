import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'anatorres', description: 'Email o username' })
  @IsString()
  @IsNotEmpty()
  identificador!: string;

  @ApiProperty({ example: 'ClaveSegura123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
