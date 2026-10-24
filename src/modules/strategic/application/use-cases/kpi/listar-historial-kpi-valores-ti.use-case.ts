import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { KpiRepository } from '../../../domain/repositories/kpi.repository';
import { KpiValorRepository } from '../../../domain/repositories/kpi-valor.repository';

@Injectable()
export class ListarHistorialKpiValoresTiUseCase {
  constructor(
    private readonly kpiRepository: KpiRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly kpiValorRepository: KpiValorRepository,
  ) {}

  async execute(kpiId: number) {
    const kpi = await this.kpiRepository.findById(kpiId);

    const tipoModulo = await this.tipoModuloRepository.findByCodigo('TI');

    if (
      !kpi ||
      !kpi.estado ||
      !tipoModulo ||
      kpi.objetivo_estrategico.tipo_modulo_id !== tipoModulo.id
    ) {
      throw new ResourceNotFoundError('KPI no encontrado');
    }

    return this.kpiValorRepository.findHistorialByKpi(kpiId);
  }
}
