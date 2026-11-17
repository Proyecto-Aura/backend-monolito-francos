import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  CobroParams,
  CobroResultado,
  PasarelaPagoService,
} from '../../domain/services/pasarela-pago.service';

// Los tokens que entrega el checkout simulado del frontend llevan estos prefijos.
export const PREFIJO_TOKEN_SIMULADO_APROBADO = 'tkn_sim_ok_';
export const PREFIJO_TOKEN_SIMULADO_RECHAZADO = 'tkn_sim_ko_';

export const MENSAJE_RECHAZO_SIMULADO =
  'El pago fue rechazado (simulación). Intenta con otro medio de pago.';
export const MENSAJE_TOKEN_SIMULADO_INVALIDO =
  'El pago no se pudo procesar: el token de pago no es válido (simulación).';

// Pasarela de desarrollo (CULQI_SIMULADO=true): no sale a internet ni cobra. Se
// usa mientras el proyecto no tiene llaves de Culqi. El backend no arranca con
// ella activa en producción (ver config/envs.ts).
@Injectable()
export class SimuladaPasarelaPagoService implements PasarelaPagoService {
  cobrar(params: CobroParams): Promise<CobroResultado> {
    if (params.token.startsWith(PREFIJO_TOKEN_SIMULADO_APROBADO)) {
      return Promise.resolve({
        aprobado: true,
        numero_operacion: `chr_sim_${randomUUID().replaceAll('-', '').slice(0, 20)}`,
        fecha: new Date(),
      });
    }

    return Promise.resolve({
      aprobado: false,
      mensaje: params.token.startsWith(PREFIJO_TOKEN_SIMULADO_RECHAZADO)
        ? MENSAJE_RECHAZO_SIMULADO
        : MENSAJE_TOKEN_SIMULADO_INVALIDO,
    });
  }
}
