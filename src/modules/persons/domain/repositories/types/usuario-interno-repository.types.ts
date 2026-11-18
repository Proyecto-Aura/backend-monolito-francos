import { EmpleadoEntity } from '../../entities/empleado.entity';
import { PersonaEntity } from '../../entities/persona.entity';
import { UserEntity } from '../../entities/user.entity';
import { AreaEmpleado, TipoDocumento } from '../../enums/persons.enums';
import { PaginationParams } from './pagination.types';
import { RolAsignado } from './usuario-rol-repository.types';

// Nombres de rol con significado propio en la gestión de usuarios internos.
export const ROL_ADMIN = 'admin';
export const ROL_CLIENTE = 'cliente';

// Modelo de lectura: un User con al menos un rol activo distinto de `cliente`,
// junto con su persona, su empleado y sus roles activos. No es una entidad de dominio.
export interface UsuarioInterno {
  user: UserEntity;
  persona: PersonaEntity;
  empleado: EmpleadoEntity | null;
  roles: RolAsignado[];
}

export interface CreateUsuarioInternoParams {
  persona: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    tipo_documento: TipoDocumento;
    numero_documento: string;
  };
  empleado: {
    cargo: string;
    area: AreaEmpleado;
    fecha_ingreso: Date;
  };
  user: {
    email: string;
    username: string;
    contrasena_hash: string;
    estado: boolean;
    email_verificado: boolean;
    debe_cambiar_contrasena: boolean;
  };
  rol_ids: number[];
}

export interface UpdateUsuarioInternoParams {
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  username?: string;
  // Si llega, se guarda y se revocan todos los refresh tokens del usuario.
  contrasena_hash?: string;
}

export interface ListUsuariosInternosParams extends PaginationParams {
  search?: string;
  rol?: string;
  estado?: boolean;
}
