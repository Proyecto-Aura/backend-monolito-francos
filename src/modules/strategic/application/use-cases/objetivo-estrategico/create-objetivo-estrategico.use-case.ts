import { Injectable } from '@nestjs/common';
import { CreateObjetivoEstrategicoDto } from '../../dto/objetivo-estrategico-dtos/create-objetivo-estrategico.dto';
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
export class CreateObjetivoEstrategicoUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly perspectivaBscRepository: PerspectivaBscRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly validarRelacionesOe: ValidarRelacionesOeService,
  ) {}

  async execute(
    dto: CreateObjetivoEstrategicoDto,
  ): Promise<ObjetivoEstrategicoEntityEnriquecido> {
    const plan = await this.planEstrategicoRepository.findActivoById(
      dto.plan_estrategico_id,
    );

    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }

    if (plan.estado_plan.codigo !== 'BORRADOR') {
      throw new ResourceConflictError(
        'Solo se pueden registrar objetivos cuando el plan está en Borrador',
      );
    }

    const perspectiva = await this.perspectivaBscRepository.findById(
      dto.perspectiva_bsc_id,
    );

    if (!perspectiva || !perspectiva.estado) {
      throw new ResourceNotFoundError('Perspectiva BSC no encontrada');
    }

    const tipoModulo = await this.tipoModuloRepository.findByCodigo('NEG');

    if (!tipoModulo || !tipoModulo.estado) {
      throw new ResourceNotFoundError('Tipo de módulo NEG no encontrado');
    }

    const nombre = dto.nombre.trim().replace(/\s+/g, ' ');
    const objetivoExiste =
      await this.objetivoEstrategicoRepository.existsByName(
        plan.id,
        tipoModulo.id,
        nombre,
      );

    if (objetivoExiste) {
      throw new ResourceConflictError(
        'Ya existe un objetivo estratégico registrado con ese nombre en el plan',
      );
    }

    await this.validarRelacionesOe.execute({
      plan_estrategico_id: plan.id,
      tipo_modulo_id: tipoModulo.id,
      relaciones_destino_ids: dto.relaciones_destino_ids ?? [],
    });

    return this.objetivoEstrategicoRepository.create(
      {
        plan_estrategico_id: plan.id,
        perspectiva_bsc_id: perspectiva.id,
        responsable: dto.responsable,
        nombre,
        descripcion: dto.descripcion?.trim() || null,
        relaciones_destino_ids: dto.relaciones_destino_ids ?? [],
      },
      tipoModulo.id,
      'N',
    );
  }
}
