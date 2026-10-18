import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EstadoPedido } from '../../../domain/enums';

// RF-A038: el operador de ventas pasa un pedido confirmado a "en espera de inventario".
export class ActualizarEstadoPedidoDto {
  @ApiProperty({
    enum: EstadoPedido,
    example: EstadoPedido.EN_ESPERA_INVENTARIO,
    description:
      'Estado nuevo. Ventas solo puede pasar un pedido de confirmado a en_espera_inventario (RN6)',
  })
  @IsEnum(EstadoPedido)
  estado: EstadoPedido;
}
