import {
  ComprobanteEmitido,
  CreateComprobanteParams,
  EmisorComprobante,
} from './types/comprobante-repository.types';

export abstract class ComprobanteRepository {
  abstract findByPagoId(pagoId: number): Promise<ComprobanteEmitido | null>;
  abstract create(params: CreateComprobanteParams): Promise<ComprobanteEmitido>;
  // Empresa emisora activa; null si todavía no se configuró.
  abstract findEmisor(): Promise<EmisorComprobante | null>;
}
