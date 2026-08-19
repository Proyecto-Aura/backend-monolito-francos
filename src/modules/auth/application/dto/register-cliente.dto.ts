import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsEmail, IsEnum, IsNotEmpty,
  IsOptional, IsString, MaxLength, MinLength,
} from 'class-validator';
import { TipoDocumento, TipoCliente, CategoriaCliente } from '@prisma/client';

export class RegisterClienteDto {
  // --- datos de Persona ---
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
  @IsString() 
  @MaxLength(9)
  telefono?: string;

  @IsOptional() 
  @IsDateString()
  fecha_nacimiento?: string;

  @IsOptional() 
  @IsString()
  direccion?: string;

  // --- datos de Cliente ---
  @IsEnum(TipoCliente)
  tipo_cliente!: TipoCliente;

  @IsOptional() 
  @IsString() 
  @MaxLength(200)
  razon_social?: string;

  @IsEnum(CategoriaCliente)
  categoria_cliente!: CategoriaCliente;

  // --- credenciales (las elige el cliente) ---
  @IsEmail() 
  @MaxLength(150)
  email!: string;

  @IsString() 
  @IsNotEmpty() 
  @MaxLength(50)
  username!: string;

  @IsString() 
  @MinLength(8) 
  @MaxLength(255)
  password!: string;
}