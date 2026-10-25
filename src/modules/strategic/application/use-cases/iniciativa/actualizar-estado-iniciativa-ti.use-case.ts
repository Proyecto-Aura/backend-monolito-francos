import { Injectable } from '@nestjs/common';
import { UpdateEstadoIniciativaDto } from '../../dto/iniciativa-dtos/update-estado-iniciativa.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { EstadoIniciativaRepository } from '../../../domain/repositories/estado-iniciativa.repository';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { IniciativaEntityEnriquecido } from '../../../domain/repositories/types/iniciativa-repository.types';

const TRANSICIONES: Record<string, string[]> = {
  PENDIENTE: ['EN_PROCESO', 'CANCELADA'],
  EN_PROCESO: ['COMPLETADA', 'CANCELADA'],
  COMPLETADA: [],
  CANCELADA: [],
};

@Injectable()
export class ActualizarEstadoIniciativaTiUseCase {
  constructor(
    private readonly iniciativaRepository: IniciativaRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly estadoIniciativaRepository: EstadoIniciativaRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateEstadoIniciativaDto,
  ): Promise<IniciativaEntityEnriquecido> {
    const iniciativa = await this.iniciativaRepository.findById(id);

    const tipoModulo = await this.tipoModuloRepository.findByCodigo('TI');

    if (
      !iniciativa ||
      !iniciativa.estado ||
      !tipoModulo ||
      iniciativa.objetivo_estrategico.tipo_modulo_id !== tipoModulo.id
    ) {
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

    if (plan.estado_plan.codigo !== 'ACTIVO') {
      throw new ResourceConflictError(
        'Solo se puede actualizar el estado cuando el plan está Activo',
      );
    }

    const transicionesPermitidas =
      TRANSICIONES[iniciativa.estado_iniciativa.codigo] ?? [];

    if (!transicionesPermitidas.includes(dto.estado_codigo)) {
      throw new ResourceConflictError('Transición de estado no permitida');
    }

    const nuevoEstado = await this.estadoIniciativaRepository.findByCodigo(
      dto.estado_codigo,
    );

    if (!nuevoEstado) {
      throw new ResourceNotFoundError('Estado de iniciativa no encontrado');
    }

    const motivoCancelacion =
      dto.estado_codigo === 'CANCELADA' ? dto.motivo_cancelacion : undefined;

    return this.iniciativaRepository.updateEstadoIniciativa(
      id,
      nuevoEstado.id,
      motivoCancelacion,
    );
  }
}
