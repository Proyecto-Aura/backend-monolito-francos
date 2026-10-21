import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches } from 'class-validator';
import { EstadoPedido, OrigenPedido } from '../../../domain/enums';
import { PaginationQueryDto } from '../common/pagination-query.dto';

const FECHA_DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// RF-A037: filtros del listado de pedidos.
export class ListPedidosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EstadoPedido })
  @IsOptional()
  @IsEnum(EstadoPedido)
  estado?: EstadoPedido;

  @ApiPropertyOptional({ enum: OrigenPedido })
  @IsOptional()
  @IsEnum(OrigenPedido)
  origen?: OrigenPedido;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description:
      'Fecha de creación desde (YYYY-MM-DD, hora de Lima), inclusive',
  })
  @IsOptional()
  @Matches(FECHA_DIA, {
    message: 'fecha_desde debe tener el formato YYYY-MM-DD',
  })
  fecha_desde?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description:
      'Fecha de creación hasta (YYYY-MM-DD, hora de Lima), inclusive',
  })
  @IsOptional()
  @Matches(FECHA_DIA, {
    message: 'fecha_hasta debe tener el formato YYYY-MM-DD',
  })
  fecha_hasta?: string;
}
