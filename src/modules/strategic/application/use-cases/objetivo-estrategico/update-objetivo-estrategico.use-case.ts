import { Injectable } from '@nestjs/common';
import { UpdateObjetivoEstrategicoDto } from '../../dto/objetivo-estrategico-dtos/update-objetivo-estrategico.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PerspectivaBscRepository } from '../../../domain/repositories/perspectiva-bsc.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { ValidarRelacionesOeService } from './validar-relaciones-oe.service';

@Injectable()
export class UpdateObjetivoEstrategicoUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly perspectivaBscRepository: PerspectivaBscRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly validarRelacionesOe: ValidarRelacionesOeService,
  ) {}

  async execute(
    id: number,
    dto: UpdateObjetivoEstrategicoDto,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido> {
    const objetivo = await this.objetivoEstrategicoRepository.findById(id);

    const tipoModulo = await this.tipoModuloRepository.findByCodigo('NEG');

    if (!objetivo || !tipoModulo || objetivo.tipo_modulo_id !== tipoModulo.id) {
      throw new ResourceNotFoundError('Objetivo estratégico no encontrado');
    }

    const plan = await this.planEstrategicoRepository.findById(
      objetivo.plan_estrategico_id,
    );

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    if (plan.estado_plan.codigo !== 'BORRADOR') {
      throw new ResourceConflictError(
        'Solo se pueden editar objetivos cuando el plan está en Borrador',
      );
    }

    const nombre =
      dto.nombre === undefined
        ? undefined
        : dto.nombre.trim().replace(/\s+/g, ' ');

    if (
      nombre !== undefined &&
      nombre.toLowerCase() !== objetivo.nombre.toLowerCase()
    ) {
      const objetivoExiste =
        await this.objetivoEstrategicoRepository.existsByName(
          objetivo.plan_estrategico_id,
          objetivo.tipo_modulo_id,
          nombre,
          id,
        );

      if (objetivoExiste) {
        throw new ResourceConflictError(
          'Ya existe otro objetivo estratégico registrado con ese nombre en el plan',
        );
      }
    }

    if (dto.perspectiva_bsc_id !== undefined) {
      const perspectiva = await this.perspectivaBscRepository.findById(
        dto.perspectiva_bsc_id,
      );

      if (!perspectiva || !perspectiva.estado) {
        throw new ResourceNotFoundError('Perspectiva BSC no encontrada');
      }
    }

    if (dto.relaciones_destino_ids !== undefined) {
      await this.validarRelacionesOe.execute({
        origen_id: objetivo.id,
        plan_estrategico_id: objetivo.plan_estrategico_id,
        tipo_modulo_id: objetivo.tipo_modulo_id,
        relaciones_destino_ids: dto.relaciones_destino_ids,
      });
    }

    return this.objetivoEstrategicoRepository.update(id, {
      perspectiva_bsc_id: dto.perspectiva_bsc_id,
      responsable: dto.responsable,
      nombre,
      descripcion: dto.descripcion,
      relaciones_destino_ids: dto.relaciones_destino_ids,
    });
  }
}
