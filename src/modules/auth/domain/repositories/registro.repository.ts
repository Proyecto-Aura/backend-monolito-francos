import {
  RegisterClienteParams,
  RegisterEmpleadoParams,
  RegistroClienteResult,
  RegistroEmpleadoResult,
} from './types/registro-repository.types';

export abstract class RegistroRepository {
  abstract registerCliente( params: RegisterClienteParams): Promise<RegistroClienteResult>;
  abstract registerEmpleado(params: RegisterEmpleadoParams): Promise<RegistroEmpleadoResult>;
}
