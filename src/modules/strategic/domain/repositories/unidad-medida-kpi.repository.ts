import { UnidadMedidaKpiEntity } from '../entities';

export abstract class UnidadMedidaKpiRepository {
  abstract findById(id: number): Promise<UnidadMedidaKpiEntity | null>;
  abstract findAll(): Promise<UnidadMedidaKpiEntity[]>;
}
