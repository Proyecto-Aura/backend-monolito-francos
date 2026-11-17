import { TipoModuloEntity } from '../entities';

export abstract class TipoModuloRepository {
  abstract findById(id: number): Promise<TipoModuloEntity | null>;
  abstract findByCodigo(codigo: string): Promise<TipoModuloEntity | null>;
}
