import { PeriodoEntity } from '../../domain/entities';

export class PeriodoPresenter {
  static toHttp(periodo: PeriodoEntity) {
    return {
      id: periodo.id,
      codigo: periodo.codigo,
      nombre: periodo.nombre,
      numero: periodo.numero,
      mes_fin: periodo.mes_fin,
    };
  }

  static listToHttp(periodos: PeriodoEntity[]) {
    return periodos.map((periodo) => this.toHttp(periodo));
  }
}
