import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// HU-B-016: token del enlace que llega al correo nuevo.
export class VerificarCambioEmailDto {
  @ApiProperty({ example: 'a8fbd78ce10b4a669b235dc637e7cda0', maxLength: 255 })
  @Transform(recortar)
  @IsString({ message: 'El token debe ser texto' })
  @MaxLength(255, { message: 'El enlace no es válido o ya venció' })
  @IsNotEmpty({ message: 'Ingresa el token de verificación' })
  token!: string;
}
