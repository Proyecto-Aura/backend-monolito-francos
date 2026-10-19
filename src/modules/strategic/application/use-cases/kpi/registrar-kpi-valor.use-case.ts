import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { KpiValorRepository } from '../../../domain/repositories/kpi-valor.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PeriodoRepository } from '../../../domain/repositories/periodo.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { RegistrarKpiValorDto } from '../../dto/kpi-valor-dtos/registrar-kpi-valor.dto';
import { calcularColorSemaforo } from './kpi-semaforo.utils';

@Injectable()
export class RegistrarKpiValorUseCase {
  constructor(
    private readonly kpiRepository: KpiRepository,
    private readonly kpiValorRepository: KpiValorRepository,
    private readonly objetivoEstrategicoRepository: ObjetivoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly periodoRepository: PeriodoRepository,
  ) {}

  async execute(kpiId: number, dto: RegistrarKpiValorDto) {
    const kpi = await this.kpiRepository.findById(kpiId);

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

    if (plan.estado_plan.codigo !== 'ACTIVO') {
      throw new ResourceConflictError(
        'Solo se pueden registrar valores de KPI cuando el plan está Activo',
      );
    }

    const periodo = await this.periodoRepository.findById(dto.periodo_id);

    if (!periodo || !periodo.estado) {
      throw new ResourceNotFoundError('Periodo no encontrado');
    }

    if (periodo.frecuencia_id !== kpi.frecuencia_id) {
      throw new ResourceConflictError(
        'El periodo no corresponde a la frecuencia de medición del KPI',
      );
    }

    const metaDelAnio = kpi.metas_anuales.find(
      (meta) => meta.anio === dto.anio && meta.estado,
    );

    if (!metaDelAnio) {
      throw new ResourceNotFoundError(
        `No existe una meta registrada para el KPI en el año ${dto.anio}`,
      );
    }

    const semaforosDelAnio = kpi.semaforos.filter(
      (semaforo) => semaforo.anio === dto.anio && semaforo.estado,
    );

    const color = calcularColorSemaforo(dto.valor, semaforosDelAnio);

    return this.kpiValorRepository.upsert({
      kpi_id: kpi.id,
      anio: dto.anio,
      periodo_id: periodo.id,
      valor: dto.valor,
      semaforo_color: color,
    });
  }
}
