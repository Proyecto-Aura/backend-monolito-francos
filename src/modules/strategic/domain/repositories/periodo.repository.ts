import { PeriodoEntity } from '../entities';

export abstract class PeriodoRepository {
  abstract findById(id: number): Promise<PeriodoEntity | null>;
  abstract findByFrecuencia(frecuencia_id: number): Promise<PeriodoEntity[]>;
}
