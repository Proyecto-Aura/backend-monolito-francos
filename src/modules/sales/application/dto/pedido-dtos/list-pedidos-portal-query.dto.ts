import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EstadoPedido } from '../../../domain/enums';
import { PaginationQueryDto } from '../common/pagination-query.dto';

export class ListPedidosPortalQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EstadoPedido })
  @IsOptional()
  @IsEnum(EstadoPedido)
  estado?: EstadoPedido;
}
