import { EstadoReembolso } from '../../domain/enums';

// Para los mensajes: "la solicitud ya está aprobada".
const ESTADO_EN_TEXTO: Record<EstadoReembolso, string> = {
  [EstadoReembolso.PENDIENTE]: 'pendiente',
  [EstadoReembolso.APROBADO]: 'aprobada',
  [EstadoReembolso.RECHAZADO]: 'rechazada',
  [EstadoReembolso.REEMBOLSADO]: 'reembolsada',
};

export const estadoEnTexto = (estado: EstadoReembolso): string =>
  ESTADO_EN_TEXTO[estado];
