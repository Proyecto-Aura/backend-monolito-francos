export type FrontendDestino = 'tienda' | 'portal';

export interface SendVerificationEmailParams {
  to: string;
  nombre: string;
  verificationToken: string;
  frontend: FrontendDestino;
}

export interface SendDefaultCredentialsEmailParams {
  to: string;
  nombre: string;
  username: string;
  contrasenaDefault: string;
}

export interface SendClienteBienvenidaEmailParams {
  to: string;
  nombre: string;
  username: string;
  contrasenaDefault: string;
  verificationToken: string;
}

export interface SendPasswordResetEmailParams {
  to: string;
  nombre: string;
  resetToken: string;
  frontend: FrontendDestino;
}

// HU-B-016: enlace para confirmar el correo nuevo antes de aplicarlo.
export interface SendEmailChangeVerificationEmailParams {
  to: string;
  nombre: string;
  token: string;
  frontend: FrontendDestino;
}
