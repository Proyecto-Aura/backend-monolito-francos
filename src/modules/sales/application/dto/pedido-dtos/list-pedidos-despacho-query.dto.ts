import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import {
  ESTADOS_DE_DESPACHO,
  type EstadoDeDespacho,
} from '../../../domain/rules/transiciones-pedido';
import { PaginationQueryDto } from '../common/pagination-query.dto';

// RF-A094: el operador de despacho solo ve sus tres estados y puede quedarse con uno.
export class ListPedidosDespachoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS_DE_DESPACHO })
  @IsOptional()
  @IsIn(ESTADOS_DE_DESPACHO, {
    message: `estado debe ser uno de: ${ESTADOS_DE_DESPACHO.join(', ')}`,
  })
  estado?: EstadoDeDespacho;
}
