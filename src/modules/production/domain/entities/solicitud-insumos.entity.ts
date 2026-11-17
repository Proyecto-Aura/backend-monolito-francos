import { EstadoSolicitudInsumos } from '../enums';

export class SolicitudInsumosEntity {
  constructor(
    public readonly id: number,
    public codigo_solicitud: string,
    // Solicitud de producción que originó este pedido de insumos; null si se
    // creó suelta (ej. reposición de rutina, no ligada a una producción puntual).
    public readonly solicitud_produccion_id: number | null,
    public estado: EstadoSolicitudInsumos,
    public readonly fecha_creacion: Date,
    public fecha_limite: Date | null,
    public readonly solicitado_por: string,
    // Embebido (persona.nombres + apellidos) para que el front no tenga que
    // resolver al usuario aparte.
    public readonly solicitado_por_nombre: string,
    public readonly created_at: Date,
    public updated_at: Date,
    public readonly cantidad_insumos: number = 0,
  ) {}
}
