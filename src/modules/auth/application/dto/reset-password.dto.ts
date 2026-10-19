import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../../../common/validators/match.validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a8fbd78ce10b4a669b235dc637e7cda0', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token!: string;

  @ApiProperty({ example: 'ClaveSegura123', minLength: 8, maxLength: 255 })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  nueva_contrasena!: string;

  @ApiProperty({ example: 'ClaveSegura123' })
  @IsString()
  @Match('nueva_contrasena')
  confirmar_contrasena!: string;
}
