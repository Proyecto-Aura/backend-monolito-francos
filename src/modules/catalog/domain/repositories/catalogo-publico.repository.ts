import { PaginatedResult } from './types/pagination.types';
import {
  CatalogoPublicoItem,
  CatalogoPublicoProducto,
  ListCatalogoPublicoParams,
} from './types/catalogo-publico-repository.types';

// Lecturas del catálogo público (Portal B). Solo devuelve lo visible para el
// cliente: presentación activa y visible en el Portal B, con su producto y su
// categoría activos.
export abstract class CatalogoPublicoRepository {
  abstract findItems(
    params: ListCatalogoPublicoParams,
  ): Promise<PaginatedResult<CatalogoPublicoItem>>;
  // null si el producto no existe, no es visible o no tiene presentaciones
  // visibles.
  abstract findProducto(
    id: number,
    fecha_referencia: Date,
  ): Promise<CatalogoPublicoProducto | null>;
}
