import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';

interface ValidarRelacionesParams {
  origen_id?: number;
  plan_estrategico_id: number;
  tipo_modulo_id: number;
  relaciones_destino_ids: number[];
}

@Injectable()
export class ValidarRelacionesOeService {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
  ) {}

  async execute(params: ValidarRelacionesParams): Promise<void> {
    const aristas =
      params.origen_id === undefined
        ? []
        : await this.objetivoEstrategicoRepository.findRelacionesActivasPorPlanYTipo(
            params.plan_estrategico_id,
            params.tipo_modulo_id,
          );

    for (const destinoId of params.relaciones_destino_ids) {
      const destino =
        await this.objetivoEstrategicoRepository.findById(destinoId);

      if (!destino || !destino.estado) {
        throw new ResourceNotFoundError(
          'Objetivo estratégico de destino no encontrado',
        );
      }

      if (
        destino.plan_estrategico_id !== params.plan_estrategico_id ||
        destino.tipo_modulo_id !== params.tipo_modulo_id
      ) {
        throw new ResourceConflictError(
          'La relación debe ser entre objetivos del mismo plan y tipo',
        );
      }

      if (params.origen_id === undefined) {
        continue;
      }

      if (destinoId === params.origen_id) {
        throw new ResourceConflictError(
          'Un objetivo no puede relacionarse consigo mismo',
        );
      }

      const existeRelacionInversa =
        await this.objetivoEstrategicoRepository.existeRelacionInversa(
          params.origen_id,
          destinoId,
        );

      if (existeRelacionInversa) {
        throw new ResourceConflictError(
          'Ya existe la relación inversa entre estos objetivos',
        );
      }

      if (this.creaCiclo(params.origen_id, destinoId, aristas)) {
        throw new ResourceConflictError(
          'Esta relación generaría un ciclo en el mapa estratégico',
        );
      }
    }
  }

  private creaCiclo(
    origenId: number,
    destinoId: number,
    aristas: { origen_id: number; destino_id: number }[],
  ): boolean {
    const visitados = new Set<number>([destinoId]);
    const cola = [destinoId];

    while (cola.length > 0) {
      const actual = cola.shift()!;

      if (actual === origenId) {
        return true;
      }

      for (const arista of aristas) {
        if (arista.origen_id === actual && !visitados.has(arista.destino_id)) {
          visitados.add(arista.destino_id);
          cola.push(arista.destino_id);
        }
      }
    }

    return false;
  }
}
