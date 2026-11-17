import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumeroDocumentoValido } from '../../../../common/validators/numero-documento.validator';
import {
  CategoriaCliente,
  TipoCliente,
  TipoDocumento,
} from '../../../persons/domain/enums/persons.enums';

// HU-B-002 (RF-B09): los mensajes los ve el cliente en el portal, en español.
// class-validator evalúa los decoradores de abajo hacia arriba y el portal muestra
// el primer mensaje: por eso el de "campo vacío" o "formato" va al final.
export class RegisterClienteDto {
  // --- datos de Persona ---
  @ApiProperty({ example: 'Ana', maxLength: 100 })
  @IsString({ message: 'Los nombres deben ser texto' })
  @MaxLength(100, { message: 'Los nombres no pueden pasar de 100 caracteres' })
  @IsNotEmpty({ message: 'Ingresa tus nombres' })
  nombres!: string;

  @ApiProperty({ example: 'Torres', maxLength: 100 })
  @IsString({ message: 'El apellido paterno debe ser texto' })
  @MaxLength(100, {
    message: 'El apellido paterno no puede pasar de 100 caracteres',
  })
  @IsNotEmpty({ message: 'Ingresa tu apellido paterno' })
  apellido_paterno!: string;

  @ApiProperty({ example: 'Vega', maxLength: 100 })
  @IsString({ message: 'El apellido materno debe ser texto' })
  @MaxLength(100, {
    message: 'El apellido materno no puede pasar de 100 caracteres',
  })
  @IsNotEmpty({ message: 'Ingresa tu apellido materno' })
  apellido_materno!: string;

  @ApiProperty({ enum: TipoDocumento, example: TipoDocumento.DNI })
  @IsEnum(TipoDocumento, {
    message: 'El tipo de documento debe ser DNI, RUC, CE o pasaporte',
  })
  tipo_documento!: TipoDocumento;

  @ApiProperty({ example: '88112233', maxLength: 20 })
  @IsString({ message: 'El número de documento debe ser texto' })
  @MaxLength(20, {
    message: 'El número de documento no puede pasar de 20 caracteres',
  })
  @IsNumeroDocumentoValido({
    message:
      'El número de documento no es válido: el DNI tiene 8 dígitos, el RUC 11, el CE de 9 a 12 caracteres y el pasaporte de 6 a 12',
  })
  @IsNotEmpty({ message: 'Ingresa tu número de documento' })
  numero_documento!: string;

  @ApiPropertyOptional({ example: '987654321', maxLength: 9 })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @MaxLength(9, { message: 'El teléfono no puede pasar de 9 dígitos' })
  telefono?: string;

  @ApiPropertyOptional({ example: '1998-05-12' })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de nacimiento no es una fecha válida' },
  )
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ example: 'Av. Los Girasoles 123' })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  direccion?: string;

  @ApiPropertyOptional({
    example: '150131',
    description: 'Código del distrito (ubigeo INEI, 6 dígitos)',
  })
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'El distrito no es válido' })
  distrito_id?: string;

  // --- datos de Cliente ---
  @ApiProperty({ enum: TipoCliente, example: TipoCliente.PERSONA_NATURAL })
  @IsEnum(TipoCliente, {
    message: 'El tipo de cliente debe ser persona natural o empresa',
  })
  tipo_cliente!: TipoCliente;

  @ApiPropertyOptional({
    example: 'Distribuidora El Sol S.A.C.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'La razón social debe ser texto' })
  @MaxLength(200, {
    message: 'La razón social no puede pasar de 200 caracteres',
  })
  razon_social?: string;

  @ApiProperty({ enum: CategoriaCliente, example: CategoriaCliente.MINORISTA })
  @IsEnum(CategoriaCliente, {
    message: 'La categoría de cliente debe ser minorista o mayorista',
  })
  categoria_cliente!: CategoriaCliente;

  // --- credenciales (las elige el cliente) ---
  @ApiProperty({ example: 'ana.torres@gmail.com', maxLength: 150 })
  @MaxLength(150, { message: 'El correo no puede pasar de 150 caracteres' })
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  email!: string;

  @ApiProperty({ example: 'anatorres', maxLength: 50 })
  @IsString({ message: 'El nombre de usuario debe ser texto' })
  @MaxLength(50, {
    message: 'El nombre de usuario no puede pasar de 50 caracteres',
  })
  @IsNotEmpty({ message: 'Ingresa un nombre de usuario' })
  username!: string;

  @ApiProperty({ example: 'ClaveSegura123', minLength: 8, maxLength: 255 })
  @IsString({ message: 'La contraseña debe ser texto' })
  @MaxLength(255, {
    message: 'La contraseña no puede pasar de 255 caracteres',
  })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;
}
