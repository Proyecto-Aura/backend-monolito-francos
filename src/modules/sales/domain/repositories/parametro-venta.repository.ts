import { ParametroVentaEntity } from '../entities/parametro-venta.entity';
import { UpdateParametroVentaParams } from './types/parametro-venta-repository.types';

export abstract class ParametroVentaRepository {
  // Siempre devuelve la fila única; si no existe (base nueva o limpiada) la crea
  // con los valores por defecto.
  abstract get(): Promise<ParametroVentaEntity>;
  abstract update(
    params: UpdateParametroVentaParams,
  ): Promise<ParametroVentaEntity>;
}
