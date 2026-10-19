import { Injectable } from '@nestjs/common';
import { CreatePlanEstrategicoDto } from '../../dto/plan-estrategico-dtos/create-plan-estrategico.dto';
import { ResourceConflictError } from '../../../domain/errors/strategic-domain.errors';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';

@Injectable()
export class CreatePlanEstrategicoUseCase {
  constructor(
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
  ) {}

  async execute(
    dto: CreatePlanEstrategicoDto,
  ): Promise<PlanEstrategicoEntityConEstado> {
    const nombre = dto.nombre.trim().replace(/\s+/g, ' ');

    if (dto.anio_fin <= dto.anio_inicio) {
      throw new ResourceConflictError(
        'El año de fin debe ser posterior al año de inicio',
      );
    }

    const planExiste =
      await this.planEstrategicoRepository.existsByName(nombre);

    if (planExiste) {
      throw new ResourceConflictError(
        'Ya existe un plan estratégico registrado con ese nombre',
      );
    }

    return this.planEstrategicoRepository.create({
      nombre,
      descripcion: dto.descripcion ?? null,
      anio_inicio: dto.anio_inicio,
      anio_fin: dto.anio_fin,
    });
  }
}
