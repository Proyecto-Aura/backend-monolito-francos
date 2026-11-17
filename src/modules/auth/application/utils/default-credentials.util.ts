import { hashPassword } from './password.util';
import { buildEmailVerificationToken } from './email-verification.util';

export interface DefaultCredentialsResult {
  username: string;
  contrasenaHash: string;
  contrasenaPlana: string; // solo para el correo, nunca se persiste en claro
  debeCambiarContrasena: true;
  emailVerificado: false;
  tokenVerificacionEmailHash: string;
  tokenVerificacionEmailPlano: string;
  tokenVerificacionEmailExpiracion: Date;
}

export async function buildDefaultCredentials(
  numeroDocumento: string,
): Promise<DefaultCredentialsResult> {
  const contrasenaPlana = numeroDocumento;
  const contrasenaHash = await hashPassword(contrasenaPlana);
  const verification = buildEmailVerificationToken();

  return {
    username: numeroDocumento,
    contrasenaHash,
    contrasenaPlana,
    debeCambiarContrasena: true,
    emailVerificado: false,
    tokenVerificacionEmailHash: verification.tokenHash,
    tokenVerificacionEmailPlano: verification.token,
    tokenVerificacionEmailExpiracion: verification.expiresAt,
  };
}
