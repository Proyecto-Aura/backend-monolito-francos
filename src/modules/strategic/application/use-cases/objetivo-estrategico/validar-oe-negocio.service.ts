import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';

interface ValidarOeNegocioParams {
  oe_negocio_id: number;
  plan_estrategico_id: number;
}

@Injectable()
export class ValidarOeNegocioService {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
  ) {}

  async execute(params: ValidarOeNegocioParams): Promise<void> {
    const oeNegocio = await this.objetivoEstrategicoRepository.findActivoById(
      params.oe_negocio_id,
    );

    if (!oeNegocio) {
      throw new ResourceNotFoundError(
        'Objetivo estratégico de Negocio no encontrado',
      );
    }

    const tipoModuloNeg = await this.tipoModuloRepository.findByCodigo('NEG');

    if (!tipoModuloNeg || oeNegocio.tipo_modulo_id !== tipoModuloNeg.id) {
      throw new ResourceConflictError(
        'El objetivo vinculado debe ser un objetivo estratégico de Negocio',
      );
    }

    if (oeNegocio.plan_estrategico_id !== params.plan_estrategico_id) {
      throw new ResourceConflictError(
        'El objetivo de Negocio vinculado debe pertenecer al mismo plan',
      );
    }
  }
}
