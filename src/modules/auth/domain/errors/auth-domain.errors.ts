export abstract class AuthDomainError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ResourceNotFoundError extends AuthDomainError {
  readonly statusCode = 404;
}

export class ResourceConflictError extends AuthDomainError {
  readonly statusCode = 409;
}

export class InvalidCredentialsError extends AuthDomainError {
  readonly statusCode = 401;
}

export class InvalidResetTokenError extends AuthDomainError {
  readonly statusCode = 400;
}
