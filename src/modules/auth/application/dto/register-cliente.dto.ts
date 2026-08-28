import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsEmail, IsEnum, IsNotEmpty,
  IsOptional, IsString, MaxLength, MinLength,
} from 'class-validator';
import { TipoDocumento, TipoCliente, CategoriaCliente } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumeroDocumentoValido } from '../../../../common/validators/numero-documento.validator';

export class RegisterClienteDto {
  // --- datos de Persona ---
  @ApiProperty({ example: 'Ana', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres!: string;

  @ApiProperty({ example: 'Torres', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido_paterno!: string;

  @ApiProperty({ example: 'Vega', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido_materno!: string;

  @ApiProperty({ enum: TipoDocumento, example: TipoDocumento.dni })
  @IsEnum(TipoDocumento)
  tipo_documento!: TipoDocumento;

  @ApiProperty({ example: '88112233', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @IsNumeroDocumentoValido()
  numero_documento!: string;

  @ApiPropertyOptional({ example: '987654321', maxLength: 9 })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  telefono?: string;

  @ApiPropertyOptional({ example: '1998-05-12' })
  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ example: 'Av. Los Girasoles 123' })
  @IsOptional()
  @IsString()
  direccion?: string;

  // --- datos de Cliente ---
  @ApiProperty({ enum: TipoCliente, example: TipoCliente.persona_natural })
  @IsEnum(TipoCliente)
  tipo_cliente!: TipoCliente;

  @ApiPropertyOptional({ example: 'Distribuidora El Sol S.A.C.', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  razon_social?: string;

  @ApiProperty({ enum: CategoriaCliente, example: CategoriaCliente.minorista })
  @IsEnum(CategoriaCliente)
  categoria_cliente!: CategoriaCliente;

  // --- credenciales (las elige el cliente) ---
  @ApiProperty({ example: 'ana.torres@gmail.com', maxLength: 150 })
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @ApiProperty({ example: 'anatorres', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username!: string;

  @ApiProperty({ example: 'ClaveSegura123', minLength: 8, maxLength: 255 })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password!: string;
}
