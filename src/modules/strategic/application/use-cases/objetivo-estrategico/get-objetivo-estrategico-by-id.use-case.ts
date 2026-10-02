import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';

@Injectable()
export class GetObjetivoEstrategicoByIdUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
  ) {}

  async execute(id: number): Promise<ObjetivoEstrategicoEntityEnriquecido> {
    const objetivo = await this.objetivoEstrategicoRepository.findById(id);

    const tipoModulo = await this.tipoModuloRepository.findByCodigo('NEG');

    if (!objetivo || !tipoModulo || objetivo.tipo_modulo_id !== tipoModulo.id) {
      throw new ResourceNotFoundError('Objetivo estratégico no encontrado');
    }

    return objetivo;
  }
}
