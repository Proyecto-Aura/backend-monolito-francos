import { TipoDocumento, TipoCliente, CategoriaCliente } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsNumeroDocumentoValido } from '../../../../../common/validators/numero-documento.validator';

export class UpdateClienteDto {
  // --- datos de Persona ---
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  nombres?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  apellido_paterno?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  apellido_materno?: string;

  @ValidateIf((o: UpdateClienteDto) => o.numero_documento !== undefined || o.tipo_documento !== undefined)
  @IsEnum(TipoDocumento)
  tipo_documento?: TipoDocumento;

  @ValidateIf((o: UpdateClienteDto) => o.numero_documento !== undefined || o.tipo_documento !== undefined)
  @IsString() @IsNotEmpty() @MaxLength(20)
  @IsNumeroDocumentoValido()
  numero_documento?: string;

  @IsOptional()
  @Matches(/^\d{9}$/, { message: 'telefono debe contener 9 digitos' })
  telefono?: string;

  @IsOptional() @IsDateString()
  fecha_nacimiento?: string;

  @IsOptional() @IsString()
  direccion?: string;

  // --- datos de Cliente ---
  @IsOptional() @IsEnum(TipoCliente)
  tipo_cliente?: TipoCliente;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200)
  razon_social?: string;

  @IsOptional() @IsEnum(CategoriaCliente)
  categoria_cliente?: CategoriaCliente;
}