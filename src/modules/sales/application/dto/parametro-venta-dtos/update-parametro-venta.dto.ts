import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  UMBRAL_MAYORISTA_MAXIMO,
  UMBRAL_MAYORISTA_MINIMO,
} from '../../../domain/entities/parametro-venta.entity';

// Todos los campos son opcionales: se cambian solo los que llegan.
export class UpdateParametroVentaDto {
  @ApiPropertyOptional({
    example: 24,
    minimum: UMBRAL_MAYORISTA_MINIMO,
    maximum: UMBRAL_MAYORISTA_MAXIMO,
    description:
      'Umbral mayorista global (RF-A193): con más unidades que esto del mismo producto se cobra el precio mayorista, si la presentación tiene uno',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(UMBRAL_MAYORISTA_MINIMO)
  @Max(UMBRAL_MAYORISTA_MAXIMO)
  umbral_mayorista_global?: number;

  @ApiPropertyOptional({
    description:
      'Si es true, cada presentación puede tener su propio umbral; si es false rige el global para todas',
  })
  @IsOptional()
  @IsBoolean()
  umbral_por_producto?: boolean;

  @ApiPropertyOptional({
    description: 'Interruptor general de promociones del catálogo (RF-A194)',
  })
  @IsOptional()
  @IsBoolean()
  promociones_activas?: boolean;

  @ApiPropertyOptional({
    description: 'Pago con tarjeta (Culqi) en el portal del cliente (RF-A195)',
  })
  @IsOptional()
  @IsBoolean()
  culqi_activo?: boolean;

  @ApiPropertyOptional({
    description: 'Pago en efectivo en el portal del cliente (RF-A195)',
  })
  @IsOptional()
  @IsBoolean()
  efectivo_activo?: boolean;
}
