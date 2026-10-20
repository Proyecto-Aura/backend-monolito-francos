import { Prisma } from '@prisma/client';
import {
  ObjetivoEstrategicoEntity,
  RelacionOeEntity,
} from '../../domain/entities';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PerspectivaBscMapper } from './perspectiva-bsc.mapper';
import { EstadoObjetivoMapper } from './estado-objetivo.mapper';

type PrismaObjetivoEstrategicoEnriquecido =
  Prisma.ObjetivoEstrategicoGetPayload<{
    include: {
      perspectiva_bsc: true;
      estado_objetivo: true;
      relaciones_como_origen: true;
      oe_negocio: { select: { id: true; codigo: true; nombre: true } };
    };
  }>;

export class ObjetivoEstrategicoMapper {
  static toDomain(
    objetivo: PrismaObjetivoEstrategicoEnriquecido,
  ): ObjetivoEstrategicoEntityEnriquecido {
    return Object.assign(
      new ObjetivoEstrategicoEntity(
        objetivo.id,
        objetivo.codigo,
        objetivo.plan_estrategico_id,
        objetivo.perspectiva_bsc_id,
        objetivo.tipo_modulo_id,
        objetivo.oe_negocio_id,
        objetivo.estado_objetivo_id,
        objetivo.responsable,
        objetivo.nombre,
        objetivo.descripcion,
        objetivo.estado,
        objetivo.created_at,
        objetivo.updated_at,
      ),
      {
        perspectiva_bsc: PerspectivaBscMapper.toDomain(
          objetivo.perspectiva_bsc,
        ),
        estado_objetivo: EstadoObjetivoMapper.toDomain(
          objetivo.estado_objetivo,
        ),
        relaciones_como_origen: objetivo.relaciones_como_origen.map(
          (relacion) =>
            new RelacionOeEntity(
              relacion.id,
              relacion.origen_id,
              relacion.destino_id,
              relacion.estado,
            ),
        ),
        oe_negocio: objetivo.oe_negocio,
      },
    );
  }
}
