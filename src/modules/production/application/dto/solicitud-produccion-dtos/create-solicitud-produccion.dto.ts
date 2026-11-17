import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CrearDetalleLineaDto } from '../solicitud-produccion-detalle-dtos/crear-detalle-linea.dto';

export class CreateSolicitudProduccionDto {
  // Lo arma el front (mismo criterio que codigo_lote): correlativo + fecha,
  // reiniciado por día.
  @ApiProperty({ example: 'FR-SPR-001-261029', maxLength: 50 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  codigo!: string;

  @ApiPropertyOptional({ example: '2026-11-15', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsISO8601({ strict: true })
  fecha_limite?: string;

  @ApiProperty({
    type: () => CrearDetalleLineaDto,
    isArray: true,
    minItems: 1,
    example: [{ producto_terminado_id: 256, cantidad_solicitada: 50 }],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CrearDetalleLineaDto)
  detalle!: CrearDetalleLineaDto[];
}
