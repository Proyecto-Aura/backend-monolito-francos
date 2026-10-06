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
