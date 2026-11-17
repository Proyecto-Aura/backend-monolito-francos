import { Injectable } from '@nestjs/common';
import { UpdateEstadoObjetivoDto } from '../../dto/objetivo-estrategico-dtos/update-estado-objetivo.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { EstadoIniciativaRepository } from '../../../domain/repositories/estado-iniciativa.repository';
import { EstadoObjetivoRepository } from '../../../domain/repositories/estado-objetivo.repository';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';

const TRANSICIONES: Record<string, string[]> = {
  PENDIENTE: ['EN_PROCESO', 'CANCELADO'],
  EN_PROCESO: ['CUMPLIDO', 'CANCELADO'],
  CUMPLIDO: [],
  CANCELADO: [],
};

@Injectable()
export class ActualizarEstadoObjetivoTiUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly estadoObjetivoRepository: EstadoObjetivoRepository,
    private readonly estadoIniciativaRepository: EstadoIniciativaRepository,
    private readonly iniciativaRepository: IniciativaRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateEstadoObjetivoDto,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido> {
    const objetivo =
      await this.objetivoEstrategicoRepository.findActivoById(id);
    const tipoModulo = await this.tipoModuloRepository.findByCodigo('TI');

    if (!objetivo || !tipoModulo || objetivo.tipo_modulo_id !== tipoModulo.id) {
      throw new ResourceNotFoundError('Objetivo estratégico no encontrado');
    }

    const plan = await this.planEstrategicoRepository.findActivoById(
      objetivo.plan_estrategico_id,
    );

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    if (plan.estado_plan.codigo !== 'ACTIVO') {
      throw new ResourceConflictError(
        'Solo se puede actualizar el estado de avance cuando el plan está Activo',
      );
    }

    const transicionesPermitidas =
      TRANSICIONES[objetivo.estado_objetivo.codigo] ?? [];

    if (!transicionesPermitidas.includes(dto.estado_codigo)) {
      throw new ResourceConflictError('Transición de estado no permitida');
    }

    const nuevoEstado = await this.estadoObjetivoRepository.findByCodigo(
      dto.estado_codigo,
    );

    if (!nuevoEstado) {
      throw new ResourceNotFoundError('Estado de objetivo no encontrado');
    }

    const actualizado =
      await this.objetivoEstrategicoRepository.updateEstadoObjetivo(
        id,
        nuevoEstado.id,
      );

    if (dto.estado_codigo === 'CANCELADO') {
      const estadoCancelada =
        await this.estadoIniciativaRepository.findByCodigo('CANCELADA');

      if (estadoCancelada) {
        await this.iniciativaRepository.cancelarActivasPorObjetivo(
          id,
          estadoCancelada.id,
        );
      }
    }

    return actualizado;
  }
}
