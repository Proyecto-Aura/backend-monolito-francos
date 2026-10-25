import { EstadoPedido, OrigenPedido, TipoEntrega } from '../enums';

export class PedidoEntity {
  constructor(
    public readonly id: number,
    public readonly codigo: string,
    public cliente_id: string,
    public user_id: string | null,
    public origen: OrigenPedido,
    public estado: EstadoPedido,
    public tipo_entrega: TipoEntrega,
    public direccion_entrega: string | null,
    public total: number,
    public readonly created_at: Date,
    public updated_at: Date,
    // Se llena al marcarlo como entregado (RF-A098).
    public fecha_entrega: Date | null = null,
  ) {}
}
