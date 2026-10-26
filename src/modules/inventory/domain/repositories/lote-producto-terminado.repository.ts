import { LoteProductoTerminadoEntity } from '../entities';
import { ListLoteProductoTerminadoParams } from './types/lote-producto-terminado-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';

// Solo lectura: los lotes de producto terminado no se crean desde acá (nacen
// vía seed, o más adelante desde producción). Mismo patrón que
// LoteInsumoRepository salvo por eso.
export abstract class LoteProductoTerminadoRepository {
  abstract findById(id: number): Promise<LoteProductoTerminadoEntity | null>;
  abstract findMany(
    params: ListLoteProductoTerminadoParams,
  ): Promise<PaginatedResult<LoteProductoTerminadoEntity>>;
  // Lotes consumibles de un producto terminado (activo=true, estado=activo,
  // cantidad_actual>0), ordenados FEFO: vencimiento más próximo primero.
  // Sin paginar: el use-case de salida necesita la lista completa para
  // repartir la cantidad pedida entre los lotes que haga falta.
  abstract findDisponiblesParaSalida(
    producto_terminado_id: number,
  ): Promise<LoteProductoTerminadoEntity[]>;
}
