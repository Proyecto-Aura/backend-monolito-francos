import { PerspectivaBscEntity } from '../entities';

export abstract class PerspectivaBscRepository {
  abstract findById(id: number): Promise<PerspectivaBscEntity | null>;
  abstract findAll(): Promise<PerspectivaBscEntity[]>;
}
