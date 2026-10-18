import { Prisma } from '@prisma/client';
import {
  KpiEntity,
  KpiMetaAnualEntity,
  SemaforoConfigEntity,
} from '../../domain/entities';
import { KpiEntityEnriquecido } from '../../domain/repositories/types/kpi-repository.types';
import { FrecuenciaMedicionMapper } from './frecuencia-medicion.mapper';
import { UnidadMedidaKpiMapper } from './unidad-medida-kpi.mapper';

type PrismaKpiEnriquecido = Prisma.KpiGetPayload<{
  include: {
    frecuencia: true;
    unidad_medida: true;
    metas_anuales: true;
    semaforos: true;
    objetivo_estrategico: {
      select: {
        id: true;
        nombre: true;
        perspectiva_bsc: { select: { id: true; nombre: true } };
      };
    };
  };
}>;

export class KpiMapper {
  static toDomain(kpi: PrismaKpiEnriquecido): KpiEntityEnriquecido {
    return Object.assign(
      new KpiEntity(
        kpi.id,
        kpi.codigo,
        kpi.objetivo_estrategico_id,
        kpi.frecuencia_id,
        kpi.unidad_medida_id,
        kpi.nombre,
        kpi.formula,
        kpi.estado,
        kpi.created_at,
        kpi.updated_at,
      ),
      {
        frecuencia: FrecuenciaMedicionMapper.toDomain(kpi.frecuencia),
        unidad_medida: UnidadMedidaKpiMapper.toDomain(kpi.unidad_medida),
        objetivo_estrategico: {
          id: kpi.objetivo_estrategico.id,
          nombre: kpi.objetivo_estrategico.nombre,
          perspectiva_bsc: {
            id: kpi.objetivo_estrategico.perspectiva_bsc.id,
            nombre: kpi.objetivo_estrategico.perspectiva_bsc.nombre,
          },
        },
        metas_anuales: kpi.metas_anuales.map(
          (meta) =>
            new KpiMetaAnualEntity(
              meta.id,
              meta.kpi_id,
              meta.anio,
              meta.meta.toNumber(),
              meta.estado,
              meta.created_at,
              meta.updated_at,
            ),
        ),
        semaforos: kpi.semaforos.map(
          (semaforo) =>
            new SemaforoConfigEntity(
              semaforo.id,
              semaforo.kpi_id,
              semaforo.anio,
              semaforo.color,
              semaforo.color_hex,
              semaforo.operador,
              semaforo.valor_referencia.toNumber(),
              semaforo.estado,
              semaforo.created_at,
              semaforo.updated_at,
            ),
        ),
      },
    );
  }
}
