import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { FrecuenciaMedicionRepository } from '../../../domain/repositories/frecuencia-medicion.repository';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { KpiEntityEnriquecido } from '../../../domain/repositories/types/kpi-repository.types';
import { UnidadMedidaKpiRepository } from '../../../domain/repositories/unidad-medida-kpi.repository';
import { UpdateKpiDto } from '../../dto/kpi-dtos/update-kpi.dto';
import { esConfiguracionSemaforoCoherente } from './kpi-semaforo.utils';

@Injectable()
export class UpdateKpiUseCase {
  constructor(
    private readonly kpiRepository: KpiRepository,
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly frecuenciaMedicionRepository: FrecuenciaMedicionRepository,
    private readonly unidadMedidaKpiRepository: UnidadMedidaKpiRepository,
  ) {}

  async execute(id: number, dto: UpdateKpiDto): Promise<KpiEntityEnriquecido> {
    const kpi = await this.kpiRepository.findById(id);

    if (!kpi || !kpi.estado) {
      throw new ResourceNotFoundError('KPI no encontrado');
    }

    const objetivo = await this.objetivoEstrategicoRepository.findActivoById(
      kpi.objetivo_estrategico.id,
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
        'Solo se pueden editar KPIs cuando el plan está en Borrador',
      );
    }

    let objetivoDestino = objetivo;

    if (
      dto.objetivo_estrategico_id !== undefined &&
      dto.objetivo_estrategico_id !== objetivo.id
    ) {
      const nuevoObjetivo =
        await this.objetivoEstrategicoRepository.findActivoById(
          dto.objetivo_estrategico_id,
        );

      if (!nuevoObjetivo) {
        throw new ResourceNotFoundError('Objetivo estratégico no encontrado');
      }

      if (nuevoObjetivo.plan_estrategico_id !== objetivo.plan_estrategico_id) {
        throw new ResourceConflictError(
          'No se puede reasignar el KPI a un objetivo estratégico de otro plan',
        );
      }

      objetivoDestino = nuevoObjetivo;
    }

    const nombre =
      dto.nombre === undefined
        ? undefined
        : dto.nombre.trim().replace(/\s+/g, ' ');

    const cambioDeObjetivo = objetivoDestino.id !== objetivo.id;

    if (
      cambioDeObjetivo ||
      (nombre !== undefined &&
        nombre.toLowerCase() !== kpi.nombre.toLowerCase())
    ) {
      const existe = await this.kpiRepository.existsByNombre(
        objetivoDestino.id,
        nombre ?? kpi.nombre,
        id,
      );

      if (existe) {
        throw new ResourceConflictError(
          'Ya existe un KPI registrado con ese nombre para el objetivo estratégico',
        );
      }
    }

    if (dto.frecuencia_id !== undefined) {
      const frecuencia = await this.frecuenciaMedicionRepository.findById(
        dto.frecuencia_id,
      );

      if (!frecuencia || !frecuencia.estado) {
        throw new ResourceNotFoundError('Frecuencia de medición no encontrada');
      }
    }

    if (dto.unidad_medida_id !== undefined) {
      const unidadMedida = await this.unidadMedidaKpiRepository.findById(
        dto.unidad_medida_id,
      );

      if (!unidadMedida || !unidadMedida.estado) {
        throw new ResourceNotFoundError('Unidad de medida no encontrada');
      }
    }

    if (dto.metas_por_anio !== undefined) {
      const aniosPlan = Array.from(
        { length: plan.anio_fin - plan.anio_inicio + 1 },
        (_, indice) => plan.anio_inicio + indice,
      );
      const aniosRecibidos = new Set(
        dto.metas_por_anio.map((fila) => fila.anio),
      );
      const cubreTodosLosAnios =
        dto.metas_por_anio.length === aniosPlan.length &&
        aniosRecibidos.size === aniosPlan.length &&
        aniosPlan.every((anio) => aniosRecibidos.has(anio));

      if (!cubreTodosLosAnios) {
        throw new ResourceConflictError(
          `Debes registrar la meta de todos los años del plan (${plan.anio_inicio}-${plan.anio_fin})`,
        );
      }

      const operadorVerde = dto.metas_por_anio[0].operador_verde;
      const operadoresVerdesIguales = dto.metas_por_anio.every(
        (fila) => fila.operador_verde === operadorVerde,
      );

      if (!operadoresVerdesIguales) {
        throw new ResourceConflictError(
          'El operador del semáforo Verde debe ser el mismo en todos los años del KPI',
        );
      }

      for (const fila of dto.metas_por_anio) {
        if (!esConfiguracionSemaforoCoherente(fila)) {
          throw new ResourceConflictError(
            `El Amarillo no puede ser más exigente que el Verde en el año ${fila.anio}`,
          );
        }
      }
    }

    return this.kpiRepository.update(id, {
      objetivo_estrategico_id: dto.objetivo_estrategico_id,
      nombre,
      formula: dto.formula,
      frecuencia_id: dto.frecuencia_id,
      unidad_medida_id: dto.unidad_medida_id,
      metas_por_anio: dto.metas_por_anio,
    });
  }
}
