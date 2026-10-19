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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumeroDocumentoValido } from '../../../../../common/validators/numero-documento.validator';

export class UpdateClienteDto {
  // --- datos de Persona ---
  @ApiPropertyOptional({ example: 'Ana', maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres?: string;

  @ApiPropertyOptional({ example: 'Torres', maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido_paterno?: string;

  @ApiPropertyOptional({ example: 'Vega', maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido_materno?: string;

  @ApiPropertyOptional({ enum: TipoDocumento, example: TipoDocumento.dni })
  @ValidateIf(
    (o: UpdateClienteDto) =>
      o.numero_documento !== undefined || o.tipo_documento !== undefined,
  )
  @IsEnum(TipoDocumento)
  tipo_documento?: TipoDocumento;

  @ApiPropertyOptional({ example: '87654321', maxLength: 20 })
  @ValidateIf(
    (o: UpdateClienteDto) =>
      o.numero_documento !== undefined || o.tipo_documento !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @IsNumeroDocumentoValido()
  numero_documento?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @Matches(/^\d{9}$/, { message: 'telefono debe contener 9 digitos' })
  telefono?: string;

  @ApiPropertyOptional({ example: '1990-03-20' })
  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ example: 'Av. Los Girasoles 123' })
  @IsOptional()
  @IsString()
  direccion?: string;

  // --- datos de Cliente ---
  @ApiPropertyOptional({
    enum: TipoCliente,
    example: TipoCliente.persona_natural,
  })
  @IsOptional()
  @IsEnum(TipoCliente)
  tipo_cliente?: TipoCliente;

  @ApiPropertyOptional({
    example: 'Distribuidora El Sol S.A.C.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  razon_social?: string;

  @ApiPropertyOptional({
    enum: CategoriaCliente,
    example: CategoriaCliente.minorista,
  })
  @IsOptional()
  @IsEnum(CategoriaCliente)
  categoria_cliente?: CategoriaCliente;
}
