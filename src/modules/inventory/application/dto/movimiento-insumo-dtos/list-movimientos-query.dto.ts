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
import { TipoMovimientoInsumo } from '../../../domain/enums';
import { PaginationQueryDto } from '../../../../catalog/application/dto/common/pagination-query-dto';

const FECHA_DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export class ListMovimientosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'harina',
    maxLength: 150,
    description: 'Texto libre contra nombre o sku del insumo',
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
  insumo_id?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  lote_insumo_id?: number;

  @ApiPropertyOptional({ enum: TipoMovimientoInsumo, example: 'salida' })
  @IsOptional()
  @IsEnum(TipoMovimientoInsumo)
  tipo?: TipoMovimientoInsumo;

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
