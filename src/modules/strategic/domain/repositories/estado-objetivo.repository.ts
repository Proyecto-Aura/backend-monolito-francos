import { EstadoObjetivoEntity } from '../entities';

export abstract class EstadoObjetivoRepository {
  abstract findByCodigo(codigo: string): Promise<EstadoObjetivoEntity | null>;
  abstract findById(id: number): Promise<EstadoObjetivoEntity | null>;
}
