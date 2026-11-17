import { UserEntity } from '../entities';
import { UpdatePersonaParams } from './types/persona-repository.types';
import {
  CreateUserParams,
  UpdateUserParams,
} from './types/user-repository.types';

export abstract class UserRepository {
  abstract create(params: CreateUserParams): Promise<UserEntity>;
  abstract findById(id: string): Promise<UserEntity | null>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract findByEmailOrUsername(
    identificador: string,
  ): Promise<UserEntity | null>;
  abstract existsByEmail(email: string, excludeId?: string): Promise<boolean>;
  abstract existsByUsername(
    username: string,
    excludeId?: string,
  ): Promise<boolean>;
  abstract update(id: string, params: UpdateUserParams): Promise<UserEntity>;
  abstract setStatus(id: string, estado: boolean): Promise<UserEntity>;
  // Actualiza el usuario y su persona en una sola transacción.
  abstract updateWithPersona(
    id: string,
    user: UpdateUserParams,
    persona: UpdatePersonaParams,
  ): Promise<UserEntity>;
}
