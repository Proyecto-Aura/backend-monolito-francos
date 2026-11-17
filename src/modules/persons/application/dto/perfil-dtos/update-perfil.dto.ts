import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// HU-B-015: el cliente edita su nombre, email y teléfono. Todos son opcionales:
// solo se cambia lo que llega. class-validator corre los decoradores de abajo
// hacia arriba, por eso el mensaje que debe salir primero va al final.
export class UpdatePerfilDto {
  @ApiPropertyOptional({ example: 'Ana María', maxLength: 100 })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'Los nombres deben ser texto' })
  @MaxLength(100, { message: 'Los nombres no pueden pasar de 100 caracteres' })
  @IsNotEmpty({ message: 'Ingresa tus nombres' })
  nombres?: string;

  @ApiPropertyOptional({ example: 'ana.torres@correo.com', maxLength: 150 })
  @IsOptional()
  @Transform(recortar)
  @MaxLength(150, { message: 'El correo no puede pasar de 150 caracteres' })
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  email?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @Transform(recortar)
  @Matches(/^\d{9}$/, { message: 'El teléfono debe tener 9 dígitos' })
  telefono?: string;
}
