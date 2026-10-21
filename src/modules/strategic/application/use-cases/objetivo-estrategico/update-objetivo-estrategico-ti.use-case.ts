import { Injectable } from '@nestjs/common';
import { UpdateObjetivoEstrategicoTiDto } from '../../dto/objetivo-estrategico-dtos/update-objetivo-estrategico-ti.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PerspectivaBscRepository } from '../../../domain/repositories/perspectiva-bsc.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { ValidarOeNegocioService } from './validar-oe-negocio.service';
import { ValidarRelacionesOeService } from './validar-relaciones-oe.service';

@Injectable()
export class UpdateObjetivoEstrategicoTiUseCase {
  constructor(
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly perspectivaBscRepository: PerspectivaBscRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly validarRelacionesOe: ValidarRelacionesOeService,
    private readonly validarOeNegocio: ValidarOeNegocioService,
  ) {}

  async execute(
    id: number,
    dto: UpdateObjetivoEstrategicoTiDto,
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

    let relacionesDestinoFinal: number[] | undefined;

    if (dto.relaciones_destino_ids !== undefined) {
      relacionesDestinoFinal = Array.from(new Set(dto.relaciones_destino_ids));
      const destinosActuales = new Set(
        objetivo.relaciones_como_origen
          .filter((relacion) => relacion.estado)
          .map((relacion) => relacion.destino_id),
      );
      const destinosNuevos = relacionesDestinoFinal.filter(
        (destinoId) => !destinosActuales.has(destinoId),
      );

      await this.validarRelacionesOe.execute({
        origen_id: objetivo.id,
        plan_estrategico_id: objetivo.plan_estrategico_id,
        tipo_modulo_id: objetivo.tipo_modulo_id,
        relaciones_destino_ids: destinosNuevos,
      });
    }

    let oeNegocioFinal: number | undefined;

    if (dto.oe_negocio_id !== undefined) {
      await this.validarOeNegocio.execute({
        oe_negocio_id: dto.oe_negocio_id,
        plan_estrategico_id: objetivo.plan_estrategico_id,
      });
      oeNegocioFinal = dto.oe_negocio_id;
    }

    const descripcionNormalizada =
      dto.descripcion === undefined
        ? undefined
        : dto.descripcion.trim() || null;

    return this.objetivoEstrategicoRepository.update(id, {
      perspectiva_bsc_id: dto.perspectiva_bsc_id,
      responsable: dto.responsable,
      nombre,
      descripcion: descripcionNormalizada,
      relaciones_destino_ids: relacionesDestinoFinal,
      oe_negocio_id: oeNegocioFinal,
    });
  }
}
