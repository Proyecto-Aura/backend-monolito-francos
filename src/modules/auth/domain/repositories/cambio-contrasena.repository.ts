import {
  CambiarContrasenaParams,
  CredencialesUsuario,
} from './types/cambio-contrasena-repository.types';

export abstract class CambioContrasenaRepository {
  abstract findCredenciales(
    userId: string,
  ): Promise<CredencialesUsuario | null>;
  // Guarda la nueva contraseña y revoca las otras sesiones del usuario en la
  // misma transacción.
  abstract cambiarContrasena(params: CambiarContrasenaParams): Promise<void>;
}
