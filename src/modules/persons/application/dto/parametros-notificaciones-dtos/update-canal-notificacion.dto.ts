import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCanalNotificacionDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // Solo aplica al canal "portal": texto descriptivo, no una lista real.
  // El canal "email" no tiene campos propios editables: remitente/servidor/
  // seguridad se muestran en vivo desde la configuración SMTP real (.env/SES),
  // no se guardan ni se editan desde acá.
  @ApiPropertyOptional({ example: 'Clientes del Portal B', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  destinatarios?: string;
}
