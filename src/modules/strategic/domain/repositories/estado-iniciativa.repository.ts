import { EstadoIniciativaEntity } from '../entities';

export abstract class EstadoIniciativaRepository {
  abstract findByCodigo(codigo: string): Promise<EstadoIniciativaEntity | null>;
}
