export class DetallePedidoEntity {
  constructor(
    public readonly id: number,
    public pedido_id: number,
    public producto_presentacion_id: number,
    public cantidad: number,
    public precio_unitario: number,
    public precio_aplicado: number,
    public subtotal: number,
    public readonly created_at: Date,
  ) {}
}
