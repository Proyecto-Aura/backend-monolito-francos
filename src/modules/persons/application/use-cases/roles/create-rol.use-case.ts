import { Injectable } from '@nestjs/common';
import { RolRepository } from '../../../domain/repositories/rol.repository';
import { CreateRolDto } from '../../dto/rol-dtos/create-rol.dto';
import { RolEntity } from '../../../domain/entities';
import { ResourceConflictError } from '../../../domain/errors/persons-domain.errors';

@Injectable()
export class CreateRolUseCase {
  constructor(private readonly rolRepository: RolRepository) {}

  async execute(dto: CreateRolDto): Promise<RolEntity> {
    const exists = await this.rolRepository.existsByName(dto.nombre);
    if (exists) {
      throw new ResourceConflictError('Ya existe un rol con este nombre');
    }

    return this.rolRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      estado: dto.estado ?? true,
    });
  }
}
