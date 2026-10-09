import { PerspectivaBscEntity } from '../../domain/entities';

export class PerspectivaBscPresenter {
  static toHttp(perspectiva: PerspectivaBscEntity) {
    return {
      id: perspectiva.id,
      nombre: perspectiva.nombre,
      descripcion: perspectiva.descripcion,
      orden: perspectiva.orden,
    };
  }

  static listToHttp(perspectivas: PerspectivaBscEntity[]) {
    return perspectivas.map((perspectiva) => this.toHttp(perspectiva));
  }
}
