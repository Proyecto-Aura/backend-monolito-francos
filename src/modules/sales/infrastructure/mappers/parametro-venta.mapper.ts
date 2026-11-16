import { ParametroVenta as PrismaParametroVenta } from '@prisma/client';
import { ParametroVentaEntity } from '../../domain/entities/parametro-venta.entity';

export class ParametroVentaMapper {
  static toDomain(fila: PrismaParametroVenta): ParametroVentaEntity {
    return new ParametroVentaEntity(
      fila.umbral_mayorista_global,
      fila.umbral_por_producto,
      fila.promociones_activas,
      fila.culqi_activo,
      fila.efectivo_activo,
      fila.updated_at,
    );
  }
}
