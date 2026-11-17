// Lo que hace falta para validar la contraseña actual del usuario (HU-B-017).
export interface CredencialesUsuario {
  id: string;
  contrasena: string;
  estado: boolean;
}

export interface CambiarContrasenaParams {
  userId: string;
  contrasenaHash: string;
  // Sesión desde la que se cambia: sigue abierta; las demás se cierran.
  sesionActualId: string | null;
}
