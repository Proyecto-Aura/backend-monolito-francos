export interface CobroParams {
  // Token que el checkout de Culqi entrega al frontend.
  token: string;
  // Monto en soles.
  monto: number;
  email: string;
  descripcion: string;
}

export type CobroResultado =
  | { aprobado: true; numero_operacion: string; fecha: Date }
  | { aprobado: false; mensaje: string };

// Puerto hacia la pasarela de pagos; la implementación real es Culqi.
export abstract class PasarelaPagoService {
  abstract cobrar(params: CobroParams): Promise<CobroResultado>;
}
