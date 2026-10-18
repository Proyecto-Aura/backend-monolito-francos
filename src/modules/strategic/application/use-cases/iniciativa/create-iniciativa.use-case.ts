import { Injectable } from '@nestjs/common';
import { CreateIniciativaDto } from '../../dto/iniciativa-dtos/create-iniciativa.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { IniciativaEntityEnriquecido } from '../../../domain/repositories/types/iniciativa-repository.types';

@Injectable()
export class CreateIniciativaUseCase {
  constructor(
    private readonly iniciativaRepository: IniciativaRepository,
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
  ) {}

  async execute(
    dto: CreateIniciativaDto,
  ): Promise<IniciativaEntityEnriquecido> {
    const objetivo = await this.objetivoEstrategicoRepository.findActivoById(
      dto.objetivo_estrategico_id,
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
        'Solo se pueden registrar iniciativas cuando el plan está en Borrador',
      );
    }

    const fechaInicio = new Date(dto.fecha_inicio);
    const fechaFin = new Date(dto.fecha_fin);

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

    const nombre = dto.nombre.trim().replace(/\s+/g, ' ');
    const existe = await this.iniciativaRepository.existsByNombre(
      objetivo.id,
      nombre,
    );

    if (existe) {
      throw new ResourceConflictError(
        'Ya existe una iniciativa registrada con ese nombre para el objetivo estratégico',
      );
    }

    const tipoModulo = await this.tipoModuloRepository.findByCodigo('NEG');

    if (!tipoModulo || !tipoModulo.estado) {
      throw new ResourceNotFoundError('Tipo de módulo NEG no encontrado');
    }

    const totalIniciativas = await this.iniciativaRepository.countByPlanYTipo(
      plan.id,
      tipoModulo.id,
    );
    const correlativo = String(totalIniciativas + 1).padStart(3, '0');

    return this.iniciativaRepository.create(
      {
        objetivo_estrategico_id: objetivo.id,
        nombre,
        descripcion: dto.descripcion,
        responsable: dto.responsable,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      },
      plan.codigo,
      correlativo,
    );
  }
}
