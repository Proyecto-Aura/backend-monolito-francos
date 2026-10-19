import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { AreaEmpleado } from '@prisma/client';

export class CreateEmpleadoDto {
  @IsUUID('4')
  persona_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cargo?: string;

  @IsEnum(AreaEmpleado)
  area!: AreaEmpleado;

  @IsOptional()
  @IsDateString()
  fecha_ingreso?: string;

  @IsOptional()
  @IsDateString()
  fecha_des_lab?: string;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
