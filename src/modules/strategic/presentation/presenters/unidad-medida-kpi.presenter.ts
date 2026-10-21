import { UnidadMedidaKpiEntity } from '../../domain/entities';

export class UnidadMedidaKpiPresenter {
  static toHttp(unidad: UnidadMedidaKpiEntity) {
    return {
      id: unidad.id,
      nombre: unidad.nombre,
      simbolo: unidad.simbolo,
      decimales: unidad.decimales,
    };
  }

  static listToHttp(unidades: UnidadMedidaKpiEntity[]) {
    return unidades.map((unidad) => this.toHttp(unidad));
  }
}
