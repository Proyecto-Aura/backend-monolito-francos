import { TipoComprobante } from '../../enums/sales.enums';

// Boleta o factura ya emitida para un pago (HU-B-010, RF-B30).
export interface ComprobanteEmitido {
  id: number;
  pago_id: number;
  tipo: TipoComprobante;
  serie: string;
  numero: number;
  // Solo en factura: los datos que el cliente escribió al pagar (HU-B-009).
  ruc: string | null;
  razon_social: string | null;
  subtotal: number;
  total: number;
  created_at: Date;
}

export interface CreateComprobanteParams {
  pago_id: number;
  serie_comprobante_id: number;
  numero: number;
  ruc: string | null;
  razon_social: string | null;
  subtotal: number;
  total: number;
}

// Empresa que emite los comprobantes (la marcada como emisora en Configuración).
export interface EmisorComprobante {
  razon_social: string;
  ruc: string;
  direccion: string;
}
