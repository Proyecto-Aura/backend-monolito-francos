import {
  ComprobanteEmitido,
  EmisorComprobante,
} from '../repositories/types/comprobante-repository.types';

export interface LineaComprobante {
  producto: string;
  presentacion: string;
  cantidad: number;
  precio_aplicado: number;
  subtotal: number;
}

export interface EnvioComprobanteParams {
  to: string;
  cliente_nombre: string;
  pedido_codigo: string;
  comprobante: ComprobanteEmitido;
  emisor: EmisorComprobante;
  lineas: LineaComprobante[];
}

// Puerto para enviar el comprobante al correo del cliente (RF-B31).
export abstract class EnvioComprobanteService {
  abstract enviar(params: EnvioComprobanteParams): Promise<void>;
}
