export interface SendVerificationEmailParams {
  to: string;
  nombre: string;
  verificationToken: string;
}

export interface SendDefaultCredentialsEmailParams {
  to: string;
  nombre: string;
  username: string;
  contrasenaDefault: string;
}
