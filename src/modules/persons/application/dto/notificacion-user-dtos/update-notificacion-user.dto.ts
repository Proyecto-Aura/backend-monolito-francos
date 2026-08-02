import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateNotificacionUserDto {
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
