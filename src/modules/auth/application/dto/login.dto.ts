import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'anatorres', description: 'Email o username' })
  @IsString()
  @IsNotEmpty()
  identificador!: string;

  @ApiProperty({ example: 'ClaveSegura123' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description:
      'Recordar sesión: el refresh token dura 30 días en vez de los días por defecto',
  })
  @IsOptional()
  @IsBoolean()
  recordar?: boolean;
}
