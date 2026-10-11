import { Injectable } from '@nestjs/common';
import { UpdatePlanEstrategicoDto } from '../../dto/plan-estrategico-dtos/update-plan-estrategico.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';

@Injectable()
export class UpdatePlanEstrategicoUseCase {
  constructor(
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdatePlanEstrategicoDto,
  ): Promise<PlanEstrategicoEntityConEstado> {
    const plan = await this.planEstrategicoRepository.findActivoById(id);

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    if (plan.estado_plan.codigo !== 'BORRADOR') {
      throw new ResourceConflictError(
        'Solo se puede editar un plan en estado Borrador',
      );
    }

    const anioInicio = dto.anio_inicio ?? plan.anio_inicio;
    const anioFin = dto.anio_fin ?? plan.anio_fin;

    if (anioFin <= anioInicio) {
      throw new ResourceConflictError(
        'El año de fin debe ser posterior al año de inicio',
      );
    }

    const nombre =
      dto.nombre === undefined
        ? undefined
        : dto.nombre.trim().replace(/\s+/g, ' ');

    if (
      nombre !== undefined &&
      nombre.toLowerCase() !== plan.nombre.toLowerCase()
    ) {
      const planExiste = await this.planEstrategicoRepository.existsByName(
        nombre,
        id,
      );

      if (planExiste) {
        throw new ResourceConflictError(
          'Ya existe otro plan estrategico registrado con ese nombre',
        );
      }
    }

    return this.planEstrategicoRepository.update(id, {
      nombre,
      descripcion: dto.descripcion,
      anio_inicio: dto.anio_inicio,
      anio_fin: dto.anio_fin,
    });
  }
}
