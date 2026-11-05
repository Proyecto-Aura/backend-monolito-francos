import { EstadoSolicitudProduccion } from '../enums';

export class SolicitudProduccionEntity {
  constructor(
    public readonly id: number,
    public codigo: string,
    public estado: EstadoSolicitudProduccion,
    public readonly fecha_creacion: Date,
    public fecha_limite: Date | null,
    public readonly solicitado_por: string,
    // Embebido (persona.nombres + apellidos) para que el front no tenga que
    // resolver al usuario aparte.
    public readonly solicitado_por_nombre: string,
    public readonly created_at: Date,
    public updated_at: Date,
    public readonly cantidad_productos: number = 0,
  ) {}
}
