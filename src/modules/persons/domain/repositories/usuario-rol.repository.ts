import { UsuarioRolEntity } from '../entities/usuario-rol.entity';
import {
  CreateUsuarioRolParams,
  RolAsignado,
} from './types/usuario-rol-repository.types';

export abstract class UsuarioRolRepository {
  abstract create(params: CreateUsuarioRolParams): Promise<UsuarioRolEntity>;
  abstract findById(id: number): Promise<UsuarioRolEntity | null>;
  abstract findByUserId(userId: string): Promise<UsuarioRolEntity[]>;
  abstract findRolesByUserId(userId: string): Promise<RolAsignado[]>;
  abstract existsByUserAndRol(userId: string, rolId: number): Promise<boolean>;
  abstract setStatus(id: number, estado: boolean): Promise<UsuarioRolEntity>;
}
