import {
  TipoDocumento,
  TipoCliente,
  CategoriaCliente,
  AreaEmpleado,
} from '../../../../persons/domain/enums/persons.enums';
import {
  PersonaEntity,
  ClienteEntity,
  EmpleadoEntity,
  UserEntity,
} from '../../../../persons/domain/entities';

// datos necesarios para la tabla persona
export interface RegisterPersonaData {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  telefono: string | null;
  fecha_nacimiento: Date | null;
  direccion: string | null;
  distrito_id?: string | null;
}

// datos necesarios para la tabla user
export interface RegisterUserData {
  email: string;
  username: string;
  contrasena_hash: string;
  email_verificado: boolean;
  debe_cambiar_contrasena: boolean;
  token_verificacion_email: string | null;
  token_verificacion_email_expiracion: Date | null;
}

// parametros para el registro transaccional (cliente)
export interface RegisterClienteParams {
  persona: RegisterPersonaData;
  cliente: {
    tipo_cliente: TipoCliente;
    razon_social: string | null;
    categoria_cliente: CategoriaCliente;
  };
  user: RegisterUserData;
  rol_id: number;
}

// parametros para el registro transaccional (empleado)
export interface RegisterEmpleadoParams {
  persona: RegisterPersonaData;
  empleado: {
    cargo: string | null;
    area: AreaEmpleado | null;
    fecha_ingreso: Date | null;
    fecha_des_lab: Date | null;
  };
  user: RegisterUserData;
  rol_id: number;
}

// parametros de respuesta de registro (cliente)
export interface RegistroClienteResult {
  persona: PersonaEntity;
  cliente: ClienteEntity;
  user: UserEntity;
}

// parametros de respuesta de registro (empleado)
export interface RegistroEmpleadoResult {
  persona: PersonaEntity;
  empleado: EmpleadoEntity;
  user: UserEntity;
}
