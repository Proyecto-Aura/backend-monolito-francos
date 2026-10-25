export abstract class PersonsDomainError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidRequestError extends PersonsDomainError {
  readonly statusCode = 400;
}

export class ResourceNotFoundError extends PersonsDomainError {
  readonly statusCode = 404;
}

export class ResourceConflictError extends PersonsDomainError {
  readonly statusCode = 409;
}
