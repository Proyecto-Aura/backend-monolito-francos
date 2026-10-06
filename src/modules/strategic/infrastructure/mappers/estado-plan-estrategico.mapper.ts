import { EstadoPlanEstrategico as PrismaEstadoPlanEstrategico } from '@prisma/client';
import { EstadoPlanEstrategicoEntity } from '../../domain/entities';

export class EstadoPlanEstrategicoMapper {
  static toDomain(
    estadoPlan: PrismaEstadoPlanEstrategico,
  ): EstadoPlanEstrategicoEntity {
    return new EstadoPlanEstrategicoEntity(
      estadoPlan.id,
      estadoPlan.codigo,
      estadoPlan.nombre,
      estadoPlan.orden,
      estadoPlan.estado,
    );
  }
}
