import { TipoDocumento } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreatePersonaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido_paterno!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido_materno!: string;

  @IsEnum(TipoDocumento)
  tipo_documento!: TipoDocumento;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  numero_documento!: string;

  @IsOptional()
  @Matches(/^\d{9}$/, { message: 'telefono debe contener 9 digitos' })
  telefono?: string;

  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
