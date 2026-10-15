import { FrecuenciaMedicionEntity } from '../entities';

export abstract class FrecuenciaMedicionRepository {
  abstract findById(id: number): Promise<FrecuenciaMedicionEntity | null>;
}
