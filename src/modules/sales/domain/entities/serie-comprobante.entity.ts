import { TipoComprobante } from '../enums/sales.enums';

export const CORRELATIVO_MAXIMO = 99999999;

// Formato SUNAT: B### para boletas y F### para facturas.
export const SERIE_FORMATO: Record<TipoComprobante, RegExp> = {
  [TipoComprobante.BOLETA]: /^B[A-Z0-9]{3}$/,
  [TipoComprobante.FACTURA]: /^F[A-Z0-9]{3}$/,
};

export class SerieComprobanteEntity {
  constructor(
    public readonly id: number,
    public tipo: TipoComprobante,
    public serie: string,
    public correlativo_inicio: number,
    public correlativo_fin: number,
    // Último número emitido; `correlativo_inicio - 1` si todavía no emitió.
    public correlativo_actual: number,
    public umbral_alerta: number,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}

  get haEmitido(): boolean {
    return this.correlativo_actual >= this.correlativo_inicio;
  }

  get restantes(): number {
    return this.correlativo_fin - this.correlativo_actual;
  }

  get agotada(): boolean {
    return this.restantes <= 0;
  }

  // Número que entregaría la próxima reserva; null si está agotada.
  get siguiente(): number | null {
    return this.agotada ? null : this.correlativo_actual + 1;
  }

  get porAgotar(): boolean {
    return this.estado && this.restantes <= this.umbral_alerta;
  }
}
