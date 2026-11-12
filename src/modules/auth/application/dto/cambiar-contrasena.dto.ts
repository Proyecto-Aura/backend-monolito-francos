import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../../../common/validators/match.validator';

// HU-B-017 (RF-B45). class-validator corre los decoradores de abajo hacia
// arriba: el mensaje que debe salir primero va al final.
export class CambiarContrasenaDto {
  @ApiProperty({ example: 'Actual1234', maxLength: 255 })
  @MaxLength(255, {
    message: 'La contraseña actual no puede pasar de 255 caracteres',
  })
  @IsNotEmpty({ message: 'Ingresa tu contraseña actual' })
  @IsString({ message: 'La contraseña actual debe ser texto' })
  contrasena_actual!: string;

  @ApiProperty({ example: 'Nueva1234', minLength: 8, maxLength: 255 })
  @MaxLength(255, {
    message: 'La nueva contraseña no puede pasar de 255 caracteres',
  })
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @IsString({ message: 'La nueva contraseña debe ser texto' })
  nueva_contrasena!: string;

  @ApiProperty({ example: 'Nueva1234' })
  @Match('nueva_contrasena', { message: 'Las contraseñas no coinciden' })
  @IsString({ message: 'Confirma la nueva contraseña' })
  confirmar_contrasena!: string;
}
