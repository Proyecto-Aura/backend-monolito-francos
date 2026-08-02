import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateNotificacionUserDto {
  @IsInt()
  @IsPositive()
  notificacion_id!: number;

  @IsUUID('4')
  user_id!: string;

  @IsOptional()
  @IsBoolean()
  leido?: boolean;

  @IsOptional()
  @IsDateString()
  fecha_leido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sns_message_id?: string;
}
