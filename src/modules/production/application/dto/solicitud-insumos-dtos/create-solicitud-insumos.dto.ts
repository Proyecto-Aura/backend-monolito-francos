import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CrearDetalleLineaInsumoDto } from '../solicitud-insumos-detalle-dtos/crear-detalle-linea.dto';

export class CreateSolicitudInsumosDto {
  // Lo arma el front (mismo criterio que codigo de solicitud de producción):
  // correlativo + fecha, reiniciado por día.
  @ApiProperty({ example: 'FR-SIN-001-261104', maxLength: 50 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  codigo_solicitud!: string;

  @ApiPropertyOptional({
    example: 6,
    minimum: 1,
    description:
      'Id de la solicitud de producción que origina este pedido de insumos, si aplica',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  solicitud_produccion_id?: number;

  @ApiPropertyOptional({ example: '2026-11-15', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsISO8601({ strict: true })
  fecha_limite?: string;

  @ApiProperty({
    type: () => CrearDetalleLineaInsumoDto,
    isArray: true,
    minItems: 1,
    example: [{ insumo_id: 12, cantidad_solicitada: 50 }],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CrearDetalleLineaInsumoDto)
  detalle!: CrearDetalleLineaInsumoDto[];
}
