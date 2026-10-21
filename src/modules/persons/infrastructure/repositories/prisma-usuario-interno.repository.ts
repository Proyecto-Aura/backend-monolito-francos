import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CreateUsuarioInternoParams,
  ListUsuariosInternosParams,
  ROL_ADMIN,
  ROL_CLIENTE,
  UpdateUsuarioInternoParams,
  UsuarioInterno,
} from '../../domain/repositories/types/usuario-interno-repository.types';
import { UsuarioInternoRepository } from '../../domain/repositories/usuario-interno.repository';
import {
  USUARIO_INTERNO_INCLUDE,
  UsuarioInternoMapper,
} from '../mappers/usuario-interno.mapper';

// Usuario interno: al menos una asignación activa a un rol distinto de cliente.
const ES_INTERNO: Prisma.UserWhereInput = {
  usuario_roles: {
    some: { estado: true, rol: { nombre: { not: ROL_CLIENTE } } },
  },
};

@Injectable()
export class PrismaUsuarioInternoRepository implements UsuarioInternoRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(params: CreateUsuarioInternoParams): Promise<UsuarioInterno> {
    return this.prisma.$transaction(async (tx) => {
      const persona = await tx.persona.create({ data: params.persona });
      const { contrasena_hash, ...userData } = params.user;
      const user = await tx.user.create({
        data: {
          ...userData,
          persona_id: persona.id,
          contrasena: contrasena_hash,
        },
      });
      await tx.usuarioRol.createMany({
        data: params.rol_ids.map((rol_id) => ({
          user_id: user.id,
          rol_id,
          estado: true,
        })),
      });
      return this.findByIdOrThrow(tx, user.id);
    });
  }

  async findById(id: string): Promise<UsuarioInterno | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, ...ES_INTERNO },
      include: USUARIO_INTERNO_INCLUDE,
    });
    return user ? UsuarioInternoMapper.toDomain(user) : null;
  }

  async findMany(
    params: ListUsuariosInternosParams,
  ): Promise<PaginatedResult<UsuarioInterno>> {
    const filtros: Prisma.UserWhereInput[] = [ES_INTERNO];
    if (params.estado !== undefined) {
      filtros.push({ estado: params.estado });
    }
    if (params.rol) {
      filtros.push({
        usuario_roles: {
          some: {
            estado: true,
            rol: { nombre: { equals: params.rol, mode: 'insensitive' } },
          },
        },
      });
    }
    if (params.search) {
      const contiene = {
        contains: params.search,
        mode: 'insensitive',
      } satisfies Prisma.StringFilter;
      filtros.push({
        OR: [
          { username: contiene },
          { email: contiene },
          { persona: { nombres: contiene } },
          { persona: { apellido_paterno: contiene } },
          { persona: { apellido_materno: contiene } },
        ],
      });
    }
    const where: Prisma.UserWhereInput = { AND: filtros };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: USUARIO_INTERNO_INCLUDE,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => UsuarioInternoMapper.toDomain(user)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  update(
    id: string,
    params: UpdateUsuarioInternoParams,
  ): Promise<UsuarioInterno> {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          username: params.username,
          contrasena: params.contrasena_hash,
          persona: {
            update: {
              nombres: params.nombres,
              apellido_paterno: params.apellido_paterno,
              apellido_materno: params.apellido_materno,
            },
          },
        },
      });
      if (params.contrasena_hash !== undefined) {
        await this.revokeRefreshTokens(tx, id);
      }
      return this.findByIdOrThrow(tx, id);
    });
  }

  setStatus(id: string, estado: boolean): Promise<UsuarioInterno> {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { estado } });
      if (!estado) {
        await this.revokeRefreshTokens(tx, id);
      }
      return this.findByIdOrThrow(tx, id);
    });
  }

  replaceRoles(id: string, rolIds: number[]): Promise<UsuarioInterno> {
    return this.prisma.$transaction(async (tx) => {
      // La asignación `cliente` (si la hubiera) no se gestiona desde aquí.
      await tx.usuarioRol.updateMany({
        where: {
          user_id: id,
          estado: true,
          rol_id: { notIn: rolIds },
          rol: { nombre: { not: ROL_CLIENTE } },
        },
        data: { estado: false },
      });
      for (const rol_id of rolIds) {
        await tx.usuarioRol.upsert({
          where: { user_id_rol_id: { user_id: id, rol_id } },
          create: { user_id: id, rol_id, estado: true },
          update: { estado: true },
        });
      }
      return this.findByIdOrThrow(tx, id);
    });
  }

  countActiveAdmins(excludeUserId: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        id: { not: excludeUserId },
        estado: true,
        usuario_roles: {
          some: { estado: true, rol: { nombre: ROL_ADMIN, estado: true } },
        },
      },
    });
  }

  // Mismo patrón que prisma-password-reset.repository.ts: se escribe la tabla
  // refresh_token dentro de la transacción, sin depender del módulo auth.
  private async revokeRefreshTokens(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    await tx.refreshToken.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  private async findByIdOrThrow(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<UsuarioInterno> {
    const user = await tx.user.findUniqueOrThrow({
      where: { id },
      include: USUARIO_INTERNO_INCLUDE,
    });
    return UsuarioInternoMapper.toDomain(user);
  }
}
