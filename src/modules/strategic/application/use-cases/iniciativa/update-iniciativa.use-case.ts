import { Injectable } from '@nestjs/common';
import { UpdateIniciativaDto } from '../../dto/iniciativa-dtos/update-iniciativa.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { IniciativaEntityEnriquecido } from '../../../domain/repositories/types/iniciativa-repository.types';

@Injectable()
export class UpdateIniciativaUseCase {
  constructor(
    private readonly iniciativaRepository: IniciativaRepository,
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateIniciativaDto,
  ): Promise<IniciativaEntityEnriquecido> {
    const iniciativa = await this.iniciativaRepository.findById(id);

    if (!iniciativa || !iniciativa.estado) {
      throw new ResourceNotFoundError('Iniciativa no encontrada');
    }

    const objetivo = await this.objetivoEstrategicoRepository.findActivoById(
      iniciativa.objetivo_estrategico.id,
    );

    if (!objetivo) {
      throw new ResourceNotFoundError('Objetivo estratégico no encontrado');
    }

    const plan = await this.planEstrategicoRepository.findActivoById(
      objetivo.plan_estrategico_id,
    );

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    if (plan.estado_plan.codigo !== 'BORRADOR') {
      throw new ResourceConflictError(
        'Solo se pueden editar iniciativas cuando el plan está en Borrador',
      );
    }

    const fechaInicio =
      dto.fecha_inicio === undefined
        ? iniciativa.fecha_inicio
        : new Date(dto.fecha_inicio);
    const fechaFin =
      dto.fecha_fin === undefined
        ? iniciativa.fecha_fin
        : new Date(dto.fecha_fin);

    if (fechaInicio > fechaFin) {
      throw new ResourceConflictError(
        'La fecha de inicio no puede ser posterior a la fecha de fin',
      );
    }

    if (
      fechaInicio.getUTCFullYear() < plan.anio_inicio ||
      fechaInicio.getUTCFullYear() > plan.anio_fin ||
      fechaFin.getUTCFullYear() < plan.anio_inicio ||
      fechaFin.getUTCFullYear() > plan.anio_fin
    ) {
      throw new ResourceConflictError(
        `Las fechas deben estar dentro de los años del plan (${plan.anio_inicio}-${plan.anio_fin})`,
      );
    }

    const nombre =
      dto.nombre === undefined
        ? undefined
        : dto.nombre.trim().replace(/\s+/g, ' ');

    if (
      nombre !== undefined &&
      nombre.toLowerCase() !== iniciativa.nombre.toLowerCase()
    ) {
      const existe = await this.iniciativaRepository.existsByNombre(
        objetivo.id,
        nombre,
        id,
      );

      if (existe) {
        throw new ResourceConflictError(
          'Ya existe una iniciativa registrada con ese nombre para el objetivo estratégico',
        );
      }
    }

    return this.iniciativaRepository.update(id, {
      nombre,
      descripcion: dto.descripcion,
      responsable: dto.responsable,
      fecha_inicio:
        dto.fecha_inicio === undefined ? undefined : new Date(dto.fecha_inicio),
      fecha_fin:
        dto.fecha_fin === undefined ? undefined : new Date(dto.fecha_fin),
    });
  }
}
