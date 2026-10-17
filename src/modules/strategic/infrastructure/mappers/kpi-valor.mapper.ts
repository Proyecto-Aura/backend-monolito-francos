import { KpiValor, Periodo } from '@prisma/client';
import { KPI_SEMAFORO_COLORES } from '../../application/use-cases/kpi/kpi-semaforo.utils';
import { KpiValorEntity } from '../../domain/entities';
import { KpiValorEntityEnriquecido } from '../../domain/repositories/types/kpi-valor-repository.types';
import { PeriodoMapper } from './periodo.mapper';

type KpiValorConPeriodo = KpiValor & { periodo: Periodo };

export class KpiValorMapper {
  static toDomain(valor: KpiValorConPeriodo): KpiValorEntityEnriquecido {
    const entity = new KpiValorEntity(
      valor.id,
      valor.kpi_id,
      valor.anio,
      valor.periodo_id,
      Number(valor.valor),
      valor.semaforo_color,
      valor.estado,
      valor.created_at,
      valor.updated_at,
    );

    return Object.assign(entity, {
      periodo: PeriodoMapper.toDomain(valor.periodo),
      color_hex:
        KPI_SEMAFORO_COLORES[
          valor.semaforo_color as keyof typeof KPI_SEMAFORO_COLORES
        ],
    });
  }
}
