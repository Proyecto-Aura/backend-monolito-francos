export abstract class SalesDomainError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
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
