import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EstadoSolicitudInsumos } from '../../../domain/enums';
import { PaginationQueryDto } from '../../../../catalog/application/dto/common/pagination-query-dto';

const FECHA_DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export class ListSolicitudInsumosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'harina',
    maxLength: 150,
    description:
      'Texto libre contra el codigo de la solicitud o el sku/nombre del insumo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({
    enum: EstadoSolicitudInsumos,
    example: 'pendiente',
  })
  @IsOptional()
  @IsEnum(EstadoSolicitudInsumos)
  estado?: EstadoSolicitudInsumos;

  @ApiPropertyOptional({
    example: 6,
    minimum: 1,
    description: 'Filtra por la solicitud de producción que origina el pedido',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  solicitud_produccion_id?: number;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description:
      'Fecha de creación, desde (YYYY-MM-DD, hora de Lima, inclusivo)',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(FECHA_DIA, {
    message: 'fecha_desde debe tener el formato YYYY-MM-DD',
  })
  fecha_desde?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description:
      'Fecha de creación, hasta (YYYY-MM-DD, hora de Lima, inclusivo)',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(FECHA_DIA, {
    message: 'fecha_hasta debe tener el formato YYYY-MM-DD',
  })
  fecha_hasta?: string;
}
