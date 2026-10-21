import { KpiValorEntityEnriquecido } from '../../domain/repositories/types/kpi-valor-repository.types';

export class KpiValorPresenter {
  static toHttp(valor: KpiValorEntityEnriquecido) {
    return {
      id: valor.id,
      anio: valor.anio,
      periodo: {
        id: valor.periodo.id,
        codigo: valor.periodo.codigo,
        nombre: valor.periodo.nombre,
      },
      valor: valor.valor,
      semaforo: {
        color: valor.semaforo_color,
        color_hex: valor.color_hex,
      },
    };
  }

  static listToHttp(valores: KpiValorEntityEnriquecido[]) {
    return valores.map((valor) => this.toHttp(valor));
  }
}
