// RN de reembolso: pendiente → aprobado o rechazado (sin vuelta atrás) y, solo
// tras aprobarse, reembolsado cuando el dinero vuelve al cliente.
export enum EstadoReembolso {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  REEMBOLSADO = 'reembolsado',
}

// Avisos que recibe el cliente sobre su solicitud (RF-A045).
export enum TipoNotificacionReembolso {
  APROBADO = 'reembolso_aprobado',
  RECHAZADO = 'reembolso_rechazado',
  PROCESADO = 'reembolso_procesado',
}
