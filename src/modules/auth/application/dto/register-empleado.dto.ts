import { Type } from 'class-transformer';
import {
  IsDateString, IsEnum, IsInt, IsNotEmpty,
  IsOptional, IsPositive, IsString, MaxLength,
} from 'class-validator';
import { TipoDocumento } from '@prisma/client';

export class RegisterEmpleadoDto {
  // --- datos de Persona ---
  @IsString() @IsNotEmpty() @MaxLength(100)
  nombres!: string;
  @IsString() @IsNotEmpty() @MaxLength(100)
  apellido_paterno!: string;
  @IsString() @IsNotEmpty() @MaxLength(100)
  apellido_materno!: string;
  @IsEnum(TipoDocumento)
  tipo_documento!: TipoDocumento;
  @IsString() @IsNotEmpty() @MaxLength(20)
  numero_documento!: string;
  @IsOptional() @IsString() @MaxLength(9)
  telefono?: string;
  @IsOptional() @IsDateString()
  fecha_nacimiento?: string;
  @IsOptional() @IsString()
  direccion?: string;

  // --- datos de Empleado (obligatorios: todo empleado debe tener cargo y área) ---
  @IsString() @IsNotEmpty() @MaxLength(100)
  cargo!: string;
  @IsString() @IsNotEmpty() @MaxLength(100)
  area!: string;
  @IsOptional() @IsDateString()
  fecha_ingreso?: string;

  // --- credenciales: solo el email, username/password se generan solos ---
  @IsString() @IsNotEmpty() @MaxLength(150)
  email!: string;

  // --- el admin elige el rol explícitamente ---
  @Type(() => Number)
  @IsInt() @IsPositive()
  rol_id!: number;
}