import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ActualizarEstadoPedidoUseCase } from '../application/use-cases/pedido/actualizar-estado-pedido.use-case';
import { CompletarPedidoUseCase } from '../application/use-cases/pedido/completar-pedido.use-case';
import { CreatePedidoUseCase } from '../application/use-cases/pedido/create-pedido.use-case';
import { GetPedidoByIdUseCase } from '../application/use-cases/pedido/get-pedido-by-id.use-case';
import { ListPedidosUseCase } from '../application/use-cases/pedido/list-pedidos.use-case';
import { ResumirPedidoPortalUseCase } from '../application/use-cases/pedido/resumir-pedido-portal.use-case';
import { AprobarReembolsoUseCase } from '../application/use-cases/reembolso/aprobar-reembolso.use-case';
import { ConfirmarDevolucionReembolsoUseCase } from '../application/use-cases/reembolso/confirmar-devolucion-reembolso.use-case';
import { GetReembolsoByIdUseCase } from '../application/use-cases/reembolso/get-reembolso-by-id.use-case';
import { ListReembolsosUseCase } from '../application/use-cases/reembolso/list-reembolsos.use-case';
import { RechazarReembolsoUseCase } from '../application/use-cases/reembolso/rechazar-reembolso.use-case';
import { ChangeSerieComprobanteStatusUseCase } from '../application/use-cases/series-comprobante/change-serie-comprobante-status.use-case';
import { CreateSerieComprobanteUseCase } from '../application/use-cases/series-comprobante/create-serie-comprobante.use-case';
import { GetSerieComprobanteByIdUseCase } from '../application/use-cases/series-comprobante/get-serie-comprobante-by-id.use-case';
import { ListAlertasSeriesComprobanteUseCase } from '../application/use-cases/series-comprobante/list-alertas-series-comprobante.use-case';
import { ListSeriesComprobanteUseCase } from '../application/use-cases/series-comprobante/list-series-comprobante.use-case';
import { ReservarCorrelativoUseCase } from '../application/use-cases/series-comprobante/reservar-correlativo.use-case';
import { UpdateSerieComprobanteUseCase } from '../application/use-cases/series-comprobante/update-serie-comprobante.use-case';
import { PedidoRepository } from '../domain/repositories/pedido.repository';
import { ReembolsoRepository } from '../domain/repositories/reembolso.repository';
import { SerieComprobanteRepository } from '../domain/repositories/serie-comprobante.repository';
import { EvidenciaReembolsoService } from '../domain/services/evidencia-reembolso.service';
import { PasarelaPagoService } from '../domain/services/pasarela-pago.service';
import { CulqiPasarelaPagoService } from '../infrastructure/payment/culqi-pasarela-pago.service';
import { PrismaPedidoRepository } from '../infrastructure/repositories/prisma-pedido.repository';
import { PrismaReembolsoRepository } from '../infrastructure/repositories/prisma-reembolso.repository';
import { PrismaSerieComprobanteRepository } from '../infrastructure/repositories/prisma-serie-comprobante.repository';
import { S3EvidenciaReembolsoService } from '../infrastructure/storage/s3-evidencia-reembolso.service';
import { PedidosController } from './controllers/pedidos.controller';
import { PortalPedidosController } from './controllers/portal-pedidos.controller';
import { ReembolsosController } from './controllers/reembolsos.controller';
import { SeriesComprobanteController } from './controllers/series-comprobante.controller';
import { SalesDomainExceptionFilter } from './filters/sales-domain-exception.filter';

@Module({
  controllers: [
    PedidosController,
    SeriesComprobanteController,
    ReembolsosController,
    PortalPedidosController,
  ],
  providers: [
    CreatePedidoUseCase,
    ListPedidosUseCase,
    GetPedidoByIdUseCase,
    ActualizarEstadoPedidoUseCase,
    CompletarPedidoUseCase,
    ResumirPedidoPortalUseCase,
    ListReembolsosUseCase,
    GetReembolsoByIdUseCase,
    AprobarReembolsoUseCase,
    RechazarReembolsoUseCase,
    ConfirmarDevolucionReembolsoUseCase,
    { provide: PedidoRepository, useClass: PrismaPedidoRepository },
    { provide: ReembolsoRepository, useClass: PrismaReembolsoRepository },
    { provide: PasarelaPagoService, useClass: CulqiPasarelaPagoService },
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
      provide: EvidenciaReembolsoService,
      useClass: S3EvidenciaReembolsoService,
    },
    {
      provide: APP_FILTER,
      useClass: SalesDomainExceptionFilter,
    },
  ],
  // La HU de despacho (HU-A-023) marcará los pedidos como entregados con
  // CompletarPedidoUseCase; ReservarCorrelativoUseCase es el servicio interno para
  // la emisión de comprobantes (OFT0-541), sin HTTP.
  exports: [CompletarPedidoUseCase, ReservarCorrelativoUseCase],
})
export class SalesModule {}
