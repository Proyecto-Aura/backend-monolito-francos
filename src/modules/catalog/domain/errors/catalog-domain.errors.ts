export abstract class CatalogDomainError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ResourceNotFoundError extends CatalogDomainError {
  readonly statusCode = 404;
}

export class ResourceConflictError extends CatalogDomainError {
  readonly statusCode = 409;
}
