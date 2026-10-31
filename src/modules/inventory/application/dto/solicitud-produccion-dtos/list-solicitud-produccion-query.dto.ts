import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoSolicitudProduccion } from '../../../domain/enums';
import { PaginationQueryDto } from '../../../../catalog/application/dto/common/pagination-query-dto';

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

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsISO8601({ strict: true })
  fecha_desde?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsISO8601({ strict: true })
  fecha_hasta?: string;
}
