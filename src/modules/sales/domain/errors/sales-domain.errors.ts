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

// No se pudo hablar con Culqi (sin configurar, caído o sin respuesta válida).
export class PasarelaNoDisponibleError extends SalesDomainError {
  readonly statusCode = 503;
}
