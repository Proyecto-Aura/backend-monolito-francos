import { Injectable } from '@nestjs/common';
import { UpdateRolDto } from '../../dto/rol-dtos/update-rol.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { RolEntity } from '../../../domain/entities/rol.entity';
import { RolRepository } from '../../../domain/repositories/rol.repository';

@Injectable()
export class UpdateRolUseCase {
  constructor(private readonly rolRepository: RolRepository) {}

  async execute(id: number, dto: UpdateRolDto): Promise<RolEntity> {
    const rol = await this.rolRepository.findById(id);

    if (!rol) {
      throw new ResourceNotFoundError('Rol no encontrado');
    }

    if (dto.nombre && dto.nombre !== rol.nombre) {
      const exists = await this.rolRepository.existsByName(dto.nombre, id);

      if (exists) {
        throw new ResourceConflictError('Ya existe un rol con ese nombre');
      }
    }

    return this.rolRepository.update(id, {
      nombre: dto.nombre,
      descripcion: dto.descripcion,
    });
  }
}
