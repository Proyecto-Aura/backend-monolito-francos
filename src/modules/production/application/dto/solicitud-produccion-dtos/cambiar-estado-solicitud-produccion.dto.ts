import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { EstadoSolicitudProduccion } from '../../../domain/enums';

export class CambiarEstadoSolicitudProduccionDto {
  @ApiProperty({ enum: EstadoSolicitudProduccion, example: 'en_proceso' })
  @IsNotEmpty()
  @IsEnum(EstadoSolicitudProduccion)
  estado!: EstadoSolicitudProduccion;
}
