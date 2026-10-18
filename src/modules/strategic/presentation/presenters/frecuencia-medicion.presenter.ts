import { FrecuenciaMedicionEntity } from '../../domain/entities';

export class FrecuenciaMedicionPresenter {
  static toHttp(frecuencia: FrecuenciaMedicionEntity) {
    return {
      id: frecuencia.id,
      nombre: frecuencia.nombre,
      periodos_por_anio: frecuencia.periodos_por_anio,
      orden: frecuencia.orden,
    };
  }

  static listToHttp(frecuencias: FrecuenciaMedicionEntity[]) {
    return frecuencias.map((frecuencia) => this.toHttp(frecuencia));
  }
}
