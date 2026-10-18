import { MetodoPago } from '../enums';

export class PagoEntity {
  constructor(
    public readonly id: number,
    public pedido_id: number,
    public metodo_pago: MetodoPago,
    public monto: number,
    public numero_operacion: string | null,
    public fecha_pago: Date,
    public readonly created_at: Date,
  ) {}
}
