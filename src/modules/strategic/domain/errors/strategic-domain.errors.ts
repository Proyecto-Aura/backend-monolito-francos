export abstract class StrategicDomainError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ResourceNotFoundError extends StrategicDomainError {
  readonly statusCode = 404;
}

export class ResourceConflictError extends StrategicDomainError {
  readonly statusCode = 409;
}
