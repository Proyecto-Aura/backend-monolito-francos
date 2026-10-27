import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoMovimientoProductoTerminado } from '../../../domain/enums';
import { PaginationQueryDto } from '../../../../catalog/application/dto/common/pagination-query-dto';

export class ListMovimientosProductoTerminadoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'chifles',
    maxLength: 150,
    description: 'Texto libre contra sku o nombre del producto',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_terminado_id?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  lote_producto_terminado_id?: number;

  @ApiPropertyOptional({
    enum: TipoMovimientoProductoTerminado,
    example: 'salida',
  })
  @IsOptional()
  @IsEnum(TipoMovimientoProductoTerminado)
  tipo?: TipoMovimientoProductoTerminado;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;
}
