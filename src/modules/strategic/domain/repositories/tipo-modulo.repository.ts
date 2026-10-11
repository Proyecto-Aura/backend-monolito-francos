import { TipoModuloEntity } from '../entities';

export abstract class TipoModuloRepository {
  abstract findByCodigo(codigo: string): Promise<TipoModuloEntity | null>;
}
