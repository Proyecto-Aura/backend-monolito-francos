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

// SOL-000001, a partir del id de la solicitud (mismo formato que el seed).
export function formatCodigoReembolso(id: number): string {
  return `SOL-${String(id).padStart(6, '0')}`;
}

// Extensión por tipo, para cuando el nombre del archivo no deja nada utilizable.
const EXTENSION_EVIDENCIA: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const LONGITUD_MAXIMA_NOMBRE = 100;

// Nombre seguro para la key de S3: sin tildes, sin rutas y solo con letras,
// números, punto, guion y guion bajo.
export function nombreArchivoEvidencia(
  nombreOriginal: string,
  tipo: string,
): string {
  const base = nombreOriginal.split(/[\\/]/).pop() ?? '';
  const saneado = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(-LONGITUD_MAXIMA_NOMBRE);

  return saneado || `evidencia.${EXTENSION_EVIDENCIA[tipo] ?? 'bin'}`;
}

// El presenter muestra el último tramo de la key como nombre del archivo.
export function keyEvidenciaReembolso(codigo: string, nombre: string): string {
  return `reembolsos/${codigo}/${nombre}`;
}
