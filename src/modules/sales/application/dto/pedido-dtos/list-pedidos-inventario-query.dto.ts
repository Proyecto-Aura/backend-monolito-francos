import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import {
  ESTADOS_DE_INVENTARIO,
  type EstadoDeInventario,
} from '../../../domain/rules/transiciones-pedido';
import { PaginationQueryDto } from '../common/pagination-query.dto';

const FECHA_DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// Pedidos por preparar: el operario de productos terminados solo ve sus 3
// estados y puede quedarse con uno, buscar por código/cliente o filtrar por fecha.
export class ListPedidosInventarioQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS_DE_INVENTARIO })
  @IsOptional()
  @IsIn(ESTADOS_DE_INVENTARIO, {
    message: `estado debe ser uno de: ${ESTADOS_DE_INVENTARIO.join(', ')}`,
  })
  estado?: EstadoDeInventario;

  @ApiPropertyOptional({
    description: 'Busca por código de pedido o nombre/razón social del cliente',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description:
      'Fecha de creación (YYYY-MM-DD, hora de Lima). Obsoleto: usa fecha_desde/fecha_hasta',
  })
  @IsOptional()
  @Matches(FECHA_DIA, { message: 'fecha debe tener el formato YYYY-MM-DD' })
  fecha?: string;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description:
      'Rango de creación, desde (YYYY-MM-DD, hora de Lima, inclusivo)',
  })
  @IsOptional()
  @Matches(FECHA_DIA, {
    message: 'fecha_desde debe tener el formato YYYY-MM-DD',
  })
  fecha_desde?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description:
      'Rango de creación, hasta (YYYY-MM-DD, hora de Lima, inclusivo)',
  })
  @IsOptional()
  @Matches(FECHA_DIA, {
    message: 'fecha_hasta debe tener el formato YYYY-MM-DD',
  })
  fecha_hasta?: string;
}
