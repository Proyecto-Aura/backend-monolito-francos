export interface CreateUsuarioRolParams {
  user_id: string;
  rol_id: number;
  estado: boolean;
}

// Resultado de lectura con JOIN a Rol — no es una entidad de dominio,
// es la forma que necesita LoginUseCase para armar el payload del JWT.
export interface RolAsignado {
  rol_id: number;
  nombre: string;
}
