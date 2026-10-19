import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { TipoDocumento, AreaEmpleado } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumeroDocumentoValido } from '../../../../common/validators/numero-documento.validator';

export class RegisterEmpleadoDto {
  // --- datos de Persona ---
  @ApiProperty({ example: 'Carlos', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres!: string;

  @ApiProperty({ example: 'Mendoza', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido_paterno!: string;

  @ApiProperty({ example: 'Ruiz', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido_materno!: string;

  @ApiProperty({ enum: TipoDocumento, example: TipoDocumento.dni })
  @IsEnum(TipoDocumento)
  tipo_documento!: TipoDocumento;

  @ApiProperty({ example: '45678912', maxLength: 20 })
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

  @ApiPropertyOptional({ example: '1990-03-20' })
  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ example: 'Jr. Las Palmeras 456' })
  @IsOptional()
  @IsString()
  direccion?: string;

  // --- datos de Empleado (obligatorios: todo empleado debe tener cargo y área) ---
  @ApiProperty({ example: 'Vendedor', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cargo!: string;

  @ApiProperty({ enum: AreaEmpleado, example: AreaEmpleado.ventas })
  @IsEnum(AreaEmpleado)
  area!: AreaEmpleado;

  @ApiPropertyOptional({
    example: '2026-08-19',
    description: 'Si no se envía, se usa la fecha actual',
  })
  @IsOptional()
  @IsDateString()
  fecha_ingreso?: string;

  // --- credenciales: solo el email, username/password se generan solos ---
  @ApiProperty({ example: 'carlos.mendoza@francos.com', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  email!: string;

  // --- el admin elige el rol explícitamente ---
  @ApiProperty({
    example: 2,
    description: 'id del rol a asignar (ver GET /roles)',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  rol_id!: number;
}
