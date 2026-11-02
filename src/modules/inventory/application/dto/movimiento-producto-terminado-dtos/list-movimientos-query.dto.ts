import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoMovimientoProductoTerminado } from '../../../domain/enums';
import { PaginationQueryDto } from '../../../../catalog/application/dto/common/pagination-query-dto';

const FECHA_DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

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

  @ApiPropertyOptional({
    example: '2026-10-01',
    description:
      'Fecha del movimiento, desde (YYYY-MM-DD, hora de Lima, inclusivo)',
  })
  @IsOptional()
  @Matches(FECHA_DIA, {
    message: 'fecha_desde debe tener el formato YYYY-MM-DD',
  })
  fecha_desde?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description:
      'Fecha del movimiento, hasta (YYYY-MM-DD, hora de Lima, inclusivo)',
  })
  @IsOptional()
  @Matches(FECHA_DIA, {
    message: 'fecha_hasta debe tener el formato YYYY-MM-DD',
  })
  fecha_hasta?: string;
}
