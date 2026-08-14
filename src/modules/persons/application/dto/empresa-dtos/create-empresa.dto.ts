import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateEmpresaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  razon_social!: string;

  @Matches(/^\d{11}$/, { message: 'ruc debe contener 11 digitos' })
  ruc!: string;

  @IsString()
  @IsNotEmpty()
  direccion!: string;

  @IsOptional()
  @Matches(/^\d{9}$/, { message: 'telefono debe contener 9 digitos' })
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsUrl()
  logo_url?: string;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
