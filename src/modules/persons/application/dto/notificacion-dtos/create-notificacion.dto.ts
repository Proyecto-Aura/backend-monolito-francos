import { ReferenciaTipo, TipoEventoNotificacion } from '@prisma/client';
import {
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateNotificacionDto {

  @IsEnum(TipoEventoNotificacion)
  tipo!: TipoEventoNotificacion;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  titulo!: string;

  @IsString()
  @IsNotEmpty()
  mensaje!: string;

  // Ambos campos deben enviarse juntos o no enviarse.
  @ValidateIf(
    (dto: CreateNotificacionDto) =>
      dto.referencia_id !== undefined ||
      dto.referencia_tipo !== undefined,
  )
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  referencia_id?: string;

  @ValidateIf(
    (dto: CreateNotificacionDto) =>
      dto.referencia_id !== undefined ||
      dto.referencia_tipo !== undefined,
  )
  @IsDefined()
  @IsEnum(ReferenciaTipo)
  referencia_tipo?: ReferenciaTipo;
}
