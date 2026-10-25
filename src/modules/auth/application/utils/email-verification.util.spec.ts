import { hashToken } from './token.util';
import {
  EMAIL_VERIFICATION_TTL_MS,
  buildEmailVerificationToken,
  resolveFrontendDestino,
} from './email-verification.util';

describe('email verification utilities', () => {
  it('crea un token hasheado que vence en 24 horas', () => {
    const before = Date.now();
    const result = buildEmailVerificationToken();
    expect(result.tokenHash).toBe(hashToken(result.token));
    expect(result.tokenHash).not.toBe(result.token);
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + EMAIL_VERIFICATION_TTL_MS,
    );
  });

  it.each([
    [[{ nombre: 'cliente' }], 'tienda'],
    [[{ nombre: 'ventas' }], 'portal'],
    [[{ nombre: 'cliente' }, { nombre: 'ventas' }], 'portal'],
    [[], 'portal'],
  ] as const)('resuelve el destino correcto', (roles, destino) => {
    expect(resolveFrontendDestino(roles)).toBe(destino);
  });
});
