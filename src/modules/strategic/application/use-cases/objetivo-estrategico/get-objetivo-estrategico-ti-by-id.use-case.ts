import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';

@Injectable()
export class GetObjetivoEstrategicoTiByIdUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
  ) {}

  async execute(id: number): Promise<ObjetivoEstrategicoEntityEnriquecido> {
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

    return objetivo;
  }
}
