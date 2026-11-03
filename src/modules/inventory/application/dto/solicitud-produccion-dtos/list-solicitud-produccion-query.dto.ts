import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoSolicitudProduccion } from '../../../domain/enums';
import { PaginationQueryDto } from '../../../../catalog/application/dto/common/pagination-query-dto';

const FECHA_DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export class ListSolicitudProduccionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'chifles',
    maxLength: 150,
    description:
      'Texto libre contra el codigo de la solicitud o el sku/nombre del producto',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({
    enum: EstadoSolicitudProduccion,
    example: 'pendiente',
  })
  @IsOptional()
  @IsEnum(EstadoSolicitudProduccion)
  estado?: EstadoSolicitudProduccion;

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
