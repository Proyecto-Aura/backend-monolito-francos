import { EstadoReembolso } from '../enums';

export class ReembolsoEntity {
  constructor(
    public readonly id: number,
    public readonly codigo: string,
    public pago_id: number,
    public monto: number,
    public motivo_cliente: string,
    public evidencia_key: string | null,
    public estado: EstadoReembolso,
    public motivo_rechazo: string | null,
    public resuelto_por: string | null,
    public fecha_solicitud: Date,
    public fecha_resolucion: Date | null,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
