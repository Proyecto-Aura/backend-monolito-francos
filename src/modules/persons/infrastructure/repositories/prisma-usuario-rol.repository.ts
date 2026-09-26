import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { UsuarioRolEntity } from '../../domain/entities';
import {
  CreateUsuarioRolParams,
  RolAsignado,
} from '../../domain/repositories/types/usuario-rol-repository.types';
import { UsuarioRolRepository } from '../../domain/repositories/usuario-rol.repository';
import { UsuarioRolMapper } from '../mappers/usuario-rol.mapper';

@Injectable()
export class PrismaUsuarioRolRepository implements UsuarioRolRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(params: CreateUsuarioRolParams): Promise<UsuarioRolEntity> {
    const usuario_rol = await this.prisma.usuarioRol.create({
      data: params,
    });
    return UsuarioRolMapper.toDomain(usuario_rol);
  }
  async findById(id: number): Promise<UsuarioRolEntity | null> {
    const usuario_rol = await this.prisma.usuarioRol.findUnique({
      where: { id },
    });
    return usuario_rol ? UsuarioRolMapper.toDomain(usuario_rol) : null;
  }
  async findByUserId(userId: string): Promise<UsuarioRolEntity[]> {
    const usuario_roles = await this.prisma.usuarioRol.findMany({
      where: {
        user_id: userId,
        estado: true,
      },
    });
    return usuario_roles.map((usuario_rol) =>
      UsuarioRolMapper.toDomain(usuario_rol),
    );
  }
  async findRolesByUserId(userId: string): Promise<RolAsignado[]> {
    const usuario_roles = await this.prisma.usuarioRol.findMany({
      where: {
        user_id: userId,
        estado: true,
        rol: { estado: true },
      },
      include: { rol: true },
    });
    return usuario_roles.map((usuario_rol) => {
      return { rol_id: usuario_rol.rol.id, nombre: usuario_rol.rol.nombre };
    });
  }
  async existsByUserAndRol(userId: string, rolId: number): Promise<boolean> {
    const usuario_rol = await this.prisma.usuarioRol.findFirst({
      where: {
        user_id: userId,
        rol_id: rolId,
      },
      select: { id: true },
    });
    return usuario_rol !== null;
  }
  async setStatus(id: number, estado: boolean): Promise<UsuarioRolEntity> {
    const usuario_role = await this.prisma.usuarioRol.update({
      data: { estado },
      where: { id },
    });
    return UsuarioRolMapper.toDomain(usuario_role);
  }
}
