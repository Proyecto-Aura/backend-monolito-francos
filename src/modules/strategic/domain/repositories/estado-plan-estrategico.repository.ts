import { EstadoPlanEstrategicoEntity } from '../entities';

export abstract class EstadoPlanEstrategicoRepository {
  abstract findByCodigo(
    codigo: string,
  ): Promise<EstadoPlanEstrategicoEntity | null>;
  abstract findById(id: number): Promise<EstadoPlanEstrategicoEntity | null>;
}
