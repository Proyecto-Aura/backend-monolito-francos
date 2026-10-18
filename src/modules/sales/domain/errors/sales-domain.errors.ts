export abstract class SalesDomainError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidRequestError extends SalesDomainError {
  readonly statusCode = 400;
}

// Culqi rechazó el cobro: el pedido no se registra.
export class PagoRechazadoError extends SalesDomainError {
  readonly statusCode = 402;
}

export class ResourceNotFoundError extends SalesDomainError {
  readonly statusCode = 404;
}

export class ResourceConflictError extends SalesDomainError {
  readonly statusCode = 409;
}

// Regla de negocio que cruza varios campos (prefijo según el tipo, rango).
export class InvalidSerieComprobanteError extends SalesDomainError {
  readonly statusCode = 400;
}

export type MotivoCorrelativoNoDisponible =
  'sin_serie_activa' | 'serie_inactiva' | 'serie_agotada';

// La reserva no pudo entregar un número (409 si se propaga a HTTP).
export class CorrelativoNoDisponibleError extends SalesDomainError {
  readonly statusCode = 409;

  constructor(
    readonly motivo: MotivoCorrelativoNoDisponible,
    message: string,
  ) {
    super(message);
  }
}

// No se pudo hablar con Culqi (sin configurar, caído o sin respuesta válida).
export class PasarelaNoDisponibleError extends SalesDomainError {
  readonly statusCode = 503;
}
