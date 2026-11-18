import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
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
import { TipoDocumento } from '../../../domain/enums/persons.enums';
import { IsNumeroDocumentoValido } from '../../../../../common/validators/numero-documento.validator';
import { SetRolesUsuarioInternoDto } from './set-roles-usuario-interno.dto';

// Sin "@": así un username nunca coincide con un email en el login,
// que busca por email o username indistintamente.
export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,50}$/;
const USERNAME_MESSAGE =
  'username debe tener entre 3 y 50 caracteres: letras, números, punto, guion o guion bajo';

export class CreateUsuarioInternoDto extends SetRolesUsuarioInternoDto {
  @ApiProperty({ example: 'Lucia', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres!: string;

  @ApiProperty({ example: 'Quispe', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido_paterno!: string;

  @ApiProperty({ example: 'Huaman', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido_materno!: string;

  @ApiProperty({ enum: TipoDocumento, example: TipoDocumento.DNI })
  @IsEnum(TipoDocumento)
  tipo_documento!: TipoDocumento;

  @ApiProperty({ example: '45678912', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @IsNumeroDocumentoValido()
  numero_documento!: string;

  @ApiProperty({ example: 'lucia.quispe@francos.com', maxLength: 150 })
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @ApiProperty({ example: 'lquispe', minLength: 3, maxLength: 50 })
  @IsString()
  @Matches(USERNAME_PATTERN, { message: USERNAME_MESSAGE })
  username!: string;

  @ApiProperty({ example: 'ClaveSegura123', minLength: 8, maxLength: 255 })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  contrasena!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;

  // Todo usuario interno es también un empleado (ver registro de empleado).
  @ApiProperty({ example: 'Vendedor', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cargo!: string;

  // Texto libre: no necesariamente corresponde a un rol predefinido
  // (ej. "gerencia" para la cuenta de un gerente).
  @ApiPropertyOptional({ example: 'ventas', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @ApiPropertyOptional({
    example: '2026-08-19',
    description: 'Si no se envía, se usa la fecha actual',
  })
  @IsOptional()
  @IsDateString()
  fecha_ingreso?: string;
}
