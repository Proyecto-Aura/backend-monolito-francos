import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ChangeSerieComprobanteStatusUseCase } from '../application/use-cases/series-comprobante/change-serie-comprobante-status.use-case';
import { CreateSerieComprobanteUseCase } from '../application/use-cases/series-comprobante/create-serie-comprobante.use-case';
import { GetSerieComprobanteByIdUseCase } from '../application/use-cases/series-comprobante/get-serie-comprobante-by-id.use-case';
import { ListAlertasSeriesComprobanteUseCase } from '../application/use-cases/series-comprobante/list-alertas-series-comprobante.use-case';
import { ListSeriesComprobanteUseCase } from '../application/use-cases/series-comprobante/list-series-comprobante.use-case';
import { ReservarCorrelativoUseCase } from '../application/use-cases/series-comprobante/reservar-correlativo.use-case';
import { UpdateSerieComprobanteUseCase } from '../application/use-cases/series-comprobante/update-serie-comprobante.use-case';
import { SerieComprobanteRepository } from '../domain/repositories/serie-comprobante.repository';
import { PrismaSerieComprobanteRepository } from '../infrastructure/repositories/prisma-serie-comprobante.repository';
import { SeriesComprobanteController } from './controllers/series-comprobante.controller';
import { SalesDomainExceptionFilter } from './filters/sales-domain-exception.filter';

@Module({
  controllers: [SeriesComprobanteController],
  providers: [
    CreateSerieComprobanteUseCase,
    ListSeriesComprobanteUseCase,
    ListAlertasSeriesComprobanteUseCase,
    GetSerieComprobanteByIdUseCase,
    UpdateSerieComprobanteUseCase,
    ChangeSerieComprobanteStatusUseCase,
    ReservarCorrelativoUseCase,
    {
      provide: SerieComprobanteRepository,
      useClass: PrismaSerieComprobanteRepository,
    },
    {
      provide: APP_FILTER,
      useClass: SalesDomainExceptionFilter,
    },
  ],
  // Servicio interno para la emisión de comprobantes (OFT0-541), sin HTTP.
  exports: [ReservarCorrelativoUseCase],
})
export class SalesModule {}
