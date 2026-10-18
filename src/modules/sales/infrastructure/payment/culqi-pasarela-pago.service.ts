import { Injectable, Logger } from '@nestjs/common';
import { envs } from '../../../../config/envs';
import { PasarelaNoDisponibleError } from '../../domain/errors/sales-domain.errors';
import {
  CobroParams,
  CobroResultado,
  PasarelaPagoService,
} from '../../domain/services/pasarela-pago.service';

const TIMEOUT_MS = 15_000;

// El proyecto usa Culqi solo en modo de pruebas: no se aceptan llaves de producción.
const PREFIJO_LLAVE_PRUEBAS = 'sk_test_';

// Campos de la respuesta de Culqi que usa el backend. Un cargo creado responde
// con `object: 'charge'`; un rechazo, con `object: 'error'`.
interface CulqiRespuesta {
  object?: string;
  id?: string;
  creation_date?: number;
  user_message?: string;
  merchant_message?: string;
}

// RF-A035: cobra con la API de cargos de Culqi usando el token que el checkout
// entregó al frontend. Nunca registra el token ni el correo en los logs.
@Injectable()
export class CulqiPasarelaPagoService implements PasarelaPagoService {
  private readonly logger = new Logger(CulqiPasarelaPagoService.name);

  async cobrar(params: CobroParams): Promise<CobroResultado> {
    if (!envs.culqiSecretKey) {
      throw new PasarelaNoDisponibleError(
        'El pago con Culqi no está configurado en el servidor',
      );
    }

    if (!envs.culqiSecretKey.startsWith(PREFIJO_LLAVE_PRUEBAS)) {
      throw new PasarelaNoDisponibleError(
        'Culqi solo se usa en modo de pruebas: configura una llave sk_test_',
      );
    }

    let response: Response;
    try {
      response = await fetch(`${envs.culqiApiUrl}/charges`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${envs.culqiSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Culqi trabaja en céntimos.
          amount: Math.round(params.monto * 100),
          currency_code: 'PEN',
          email: params.email,
          source_id: params.token,
          description: params.descripcion,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(
        `No se pudo contactar a Culqi: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new PasarelaNoDisponibleError(
        'No se pudo contactar a Culqi; intenta de nuevo en unos minutos',
      );
    }

    const body = (await response
      .json()
      .catch(() => null)) as CulqiRespuesta | null;

    if (response.status === 201 && body?.object === 'charge' && body.id) {
      return {
        aprobado: true,
        numero_operacion: body.id,
        fecha: body.creation_date ? new Date(body.creation_date) : new Date(),
      };
    }

    // 401 y 403 indican una llave mal configurada, no un rechazo del cliente.
    if (
      response.status >= 400 &&
      response.status < 500 &&
      response.status !== 401 &&
      response.status !== 403 &&
      body?.object === 'error'
    ) {
      return {
        aprobado: false,
        mensaje: body.user_message ?? 'Culqi rechazó el pago',
      };
    }

    this.logger.error(
      `Respuesta inesperada de Culqi: HTTP ${response.status} ${body?.merchant_message ?? ''}`.trim(),
    );
    throw new PasarelaNoDisponibleError(
      'Culqi no pudo procesar el pago; intenta de nuevo en unos minutos',
    );
  }
}
