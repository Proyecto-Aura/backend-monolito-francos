import { Injectable } from '@nestjs/common';
import { TipoComprobante } from '../../../domain/enums/sales.enums';
import { CorrelativoNoDisponibleError } from '../../../domain/errors/sales-domain.errors';
import { SerieComprobanteRepository } from '../../../domain/repositories/serie-comprobante.repository';
import { CorrelativoReservado } from '../../../domain/repositories/types/serie-comprobante-repository.types';

// Servicio interno (RF-A190) que exporta SalesModule para la emisión de
// comprobantes (OFT0-541). No tiene endpoint HTTP.
@Injectable()
export class ReservarCorrelativoUseCase {
  constructor(
    private readonly serieComprobanteRepository: SerieComprobanteRepository,
  ) {}

  async execute(tipo: TipoComprobante): Promise<CorrelativoReservado> {
    // Un segundo intento cubre la carrera en la que la serie se activa o se
    // amplía entre el UPDATE fallido y la lectura del diagnóstico.
    for (let intento = 0; intento < 2; intento++) {
      const reservado =
        await this.serieComprobanteRepository.reservarSiguiente(tipo);
      if (reservado) return reservado;

      const activa =
        await this.serieComprobanteRepository.findActivaByTipo(tipo);
      if (!activa) {
        if (await this.serieComprobanteRepository.existsByTipo(tipo)) {
          throw new CorrelativoNoDisponibleError(
            'serie_inactiva',
            `Las series de tipo ${tipo} están inactivas; activa una para emitir`,
          );
        }
        throw new CorrelativoNoDisponibleError(
          'sin_serie_activa',
          `No hay ninguna serie de tipo ${tipo} configurada`,
        );
      }
      if (activa.agotada) {
        throw new CorrelativoNoDisponibleError(
          'serie_agotada',
          `La serie ${activa.serie} agotó su rango (${activa.correlativo_fin})`,
        );
      }
    }

    throw new CorrelativoNoDisponibleError(
      'sin_serie_activa',
      `No se pudo reservar un correlativo de tipo ${tipo}; reintenta`,
    );
  }
}
