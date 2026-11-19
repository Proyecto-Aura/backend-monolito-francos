import { Injectable } from '@nestjs/common';
import { UserEntity } from '../../domain/entities';
import { UpdatePersonaParams } from '../../domain/repositories/types/persona-repository.types';
import {
  CreateUserParams,
  UpdateUserParams,
} from '../../domain/repositories/types/user-repository.types';
import { UserRepository } from '../../domain/repositories/user.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(params: CreateUserParams): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: params,
    });
    return UserMapper.toDomain(user);
  }
  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? UserMapper.toDomain(user) : null;
  }
  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? UserMapper.toDomain(user) : null;
  }
  async findByEmailOrUsername(
    identificador: string,
  ): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identificador }, { username: identificador }],
      },
    });
    return user ? UserMapper.toDomain(user) : null;
  }
  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return user !== null;
  }
  async existsByUsername(
    username: string,
    excludeId?: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        username: username,
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return user !== null;
  }
  async update(id: string, params: UpdateUserParams): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      data: params,
      where: { id },
    });
    return UserMapper.toDomain(user);
  }
  async setStatus(id: string, estado: boolean): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      data: { estado },
      where: { id },
    });
    return UserMapper.toDomain(user);
  }
  async registrarLoginFallido(
    id: string,
    maxIntentos: number,
    bloqueadoHasta: Date,
  ): Promise<boolean> {
    // `increment` lo resuelve la base en un solo UPDATE: logins fallidos en
    // paralelo (p. ej. desde muchas IPs) no pueden pisarse el conteo.
    return this.prisma.$transaction(async (tx) => {
      const { intentos_fallidos } = await tx.user.update({
        where: { id },
        data: { intentos_fallidos: { increment: 1 } },
        select: { intentos_fallidos: true },
      });
      if (intentos_fallidos < maxIntentos) {
        return false;
      }
      await tx.user.update({
        where: { id },
        data: { intentos_fallidos: 0, bloqueado_hasta: bloqueadoHasta },
      });
      return true;
    });
  }
  async reiniciarLoginFallido(id: string): Promise<void> {
    // Solo escribe si hay algo que limpiar: un login normal no toca la fila.
    await this.prisma.user.updateMany({
      where: {
        id,
        OR: [
          { intentos_fallidos: { gt: 0 } },
          { bloqueado_hasta: { not: null } },
        ],
      },
      data: { intentos_fallidos: 0, bloqueado_hasta: null },
    });
  }
  async updateWithPersona(
    id: string,
    user: UpdateUserParams,
    persona: UpdatePersonaParams,
  ): Promise<UserEntity> {
    const actualizado = await this.prisma.user.update({
      data: { ...user, persona: { update: persona } },
      where: { id },
    });
    return UserMapper.toDomain(actualizado);
  }
}
