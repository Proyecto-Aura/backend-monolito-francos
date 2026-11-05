import { LoteProductoTerminadoEntity } from '../entities';
import {
  CreateLoteProductoTerminadoParams,
  ListLoteProductoTerminadoParams,
} from './types/lote-producto-terminado-repository.types';
import { PaginatedResult } from '../../../catalog/domain/repositories/types/pagination.types';

// OFT0-263: mismo patrón que LoteInsumoRepository (create() nace en 0 y deja
// que el movimiento "entrada" lo lleve a cantidad_inicial).
export abstract class LoteProductoTerminadoRepository {
  abstract create(
    params: CreateLoteProductoTerminadoParams,
  ): Promise<LoteProductoTerminadoEntity>;
  abstract findById(id: number): Promise<LoteProductoTerminadoEntity | null>;
  abstract findMany(
    params: ListLoteProductoTerminadoParams,
  ): Promise<PaginatedResult<LoteProductoTerminadoEntity>>;
  abstract existsByCodigoLote(codigo_lote: string): Promise<boolean>;
  // Lotes consumibles de un producto terminado (activo=true, estado=activo,
  // cantidad_actual>0), ordenados FEFO: vencimiento más próximo primero.
  // Sin paginar: el use-case de salida necesita la lista completa para
  // repartir la cantidad pedida entre los lotes que haga falta.
  abstract findDisponiblesParaSalida(
    producto_terminado_id: number,
  ): Promise<LoteProductoTerminadoEntity[]>;
  // Ids (sin duplicar) de producto_terminado que ya tienen al menos un lote
  // creado para esta solicitud. Para marcar, en el detalle de la solicitud,
  // qué líneas ya se produjeron y cuáles faltan (OFT0-262).
  abstract findProductoTerminadoIdsConLotePorSolicitud(
    solicitud_produccion_id: number,
  ): Promise<number[]>;
}
