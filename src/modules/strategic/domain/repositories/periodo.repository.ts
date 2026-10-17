import { PeriodoEntity } from '../entities';

export abstract class PeriodoRepository {
  abstract findByFrecuencia(frecuencia_id: number): Promise<PeriodoEntity[]>;
}
