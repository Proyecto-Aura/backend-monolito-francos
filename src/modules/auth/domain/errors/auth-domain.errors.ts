export abstract class AuthDomainError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidRequestError extends AuthDomainError {
  readonly statusCode = 400;
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

export class InvalidVerificationTokenError extends AuthDomainError {
  readonly statusCode = 400;
}

export class EmailNotVerifiedError extends AuthDomainError {
  readonly statusCode = 403;
}

// Cuenta bloqueada temporalmente tras varios logins fallidos seguidos.
export class AccountLockedError extends AuthDomainError {
  readonly statusCode = 429;

  constructor(
    message: string,
    // Segundos hasta el desbloqueo; el filtro lo envía como cabecera Retry-After.
    readonly retryAfterSeconds: number,
  ) {
    super(message);
  }
}
