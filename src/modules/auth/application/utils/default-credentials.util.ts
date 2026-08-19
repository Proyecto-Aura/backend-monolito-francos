import { hashPassword } from './password.util';
import { generateRandomToken } from './token.util';

const HORAS_EXPIRACION_TOKEN_EMAIL = 24;

export interface DefaultCredentialsResult {
  username: string;
  contrasenaHash: string;
  contrasenaPlana: string; // solo para el correo, nunca se persiste en claro
  debeCambiarContrasena: true;
  emailVerificado: false;
  tokenVerificacionEmail: string;
  tokenVerificacionEmailExpiracion: Date;
}

export async function buildDefaultCredentials(numeroDocumento: string): Promise<DefaultCredentialsResult> {
  const contrasenaPlana = numeroDocumento;
  const contrasenaHash = await hashPassword(contrasenaPlana);
  const tokenVerificacionEmail = generateRandomToken();
  const tokenVerificacionEmailExpiracion = new Date(
    Date.now() + HORAS_EXPIRACION_TOKEN_EMAIL * 60 * 60 * 1000,
  );

  return {
    username: numeroDocumento,
    contrasenaHash,
    contrasenaPlana,
    debeCambiarContrasena: true,
    emailVerificado: false,
    tokenVerificacionEmail,
    tokenVerificacionEmailExpiracion,
  };
}