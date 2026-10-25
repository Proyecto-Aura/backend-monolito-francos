import { FrontendDestino } from '../../domain/services/types/email-service.types';
import { generateRandomToken, hashToken } from './token.util';

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const ROL_CLIENTE = 'cliente';

export function buildEmailVerificationToken() {
  const token = generateRandomToken();
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  };
}

export function resolveFrontendDestino(
  roles: { nombre: string }[],
): FrontendDestino {
  return roles.length > 0 && roles.every((role) => role.nombre === ROL_CLIENTE)
    ? 'tienda'
    : 'portal';
}
