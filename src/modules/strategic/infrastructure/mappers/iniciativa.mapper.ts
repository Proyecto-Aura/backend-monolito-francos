import { Prisma } from '@prisma/client';
import { IniciativaEntity } from '../../domain/entities';
import { IniciativaEntityEnriquecido } from '../../domain/repositories/types/iniciativa-repository.types';
import { EstadoIniciativaMapper } from './estado-iniciativa.mapper';

type PrismaIniciativaEnriquecida = Prisma.IniciativaGetPayload<{
  include: {
    estado_iniciativa: true;
    objetivo_estrategico: {
      select: {
        id: true;
        codigo: true;
        nombre: true;
        responsable: true;
        perspectiva_bsc: { select: { id: true; nombre: true } };
      };
    };
  };
}>;

export class IniciativaMapper {
  static toDomain(
    iniciativa: PrismaIniciativaEnriquecida,
  ): IniciativaEntityEnriquecido {
    return Object.assign(
      new IniciativaEntity(
        iniciativa.id,
        iniciativa.codigo,
        iniciativa.objetivo_estrategico_id,
        iniciativa.estado_iniciativa_id,
        iniciativa.responsable,
        iniciativa.nombre,
        iniciativa.descripcion,
        iniciativa.presupuesto?.toNumber() ?? null,
        iniciativa.motivo_cancelacion,
        iniciativa.fecha_inicio,
        iniciativa.fecha_fin,
        iniciativa.estado,
        iniciativa.created_at,
        iniciativa.updated_at,
      ),
      {
        estado_iniciativa: EstadoIniciativaMapper.toDomain(
          iniciativa.estado_iniciativa,
        ),
        objetivo_estrategico: {
          id: iniciativa.objetivo_estrategico.id,
          codigo: iniciativa.objetivo_estrategico.codigo,
          nombre: iniciativa.objetivo_estrategico.nombre,
          responsable: iniciativa.objetivo_estrategico.responsable,
          perspectiva_bsc: {
            id: iniciativa.objetivo_estrategico.perspectiva_bsc.id,
            nombre: iniciativa.objetivo_estrategico.perspectiva_bsc.nombre,
          },
        },
      },
    );
  }
}
