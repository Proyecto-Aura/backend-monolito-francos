import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { InventoryModule } from '../../inventory/presentation/inventory.module';
import { ActualizarEstadoPedidoUseCase } from '../application/use-cases/pedido/actualizar-estado-pedido.use-case';
import { CompletarPedidoUseCase } from '../application/use-cases/pedido/completar-pedido.use-case';
import { CreatePedidoUseCase } from '../application/use-cases/pedido/create-pedido.use-case';
import { DespacharPedidoUseCase } from '../application/use-cases/pedido/despachar-pedido.use-case';
import { EntregarPedidoADespachoUseCase } from '../application/use-cases/pedido/entregar-pedido-a-despacho.use-case';
import { GetIndicadoresPedidosInventarioUseCase } from '../application/use-cases/pedido/get-indicadores-pedidos-inventario.use-case';
import { GetPedidoByIdUseCase } from '../application/use-cases/pedido/get-pedido-by-id.use-case';
import { GetPedidoDespachoUseCase } from '../application/use-cases/pedido/get-pedido-despacho.use-case';
import { GetPedidoInventarioUseCase } from '../application/use-cases/pedido/get-pedido-inventario.use-case';
import { ListPedidosDespachoUseCase } from '../application/use-cases/pedido/list-pedidos-despacho.use-case';
import { ListPedidosInventarioUseCase } from '../application/use-cases/pedido/list-pedidos-inventario.use-case';
import { ListPedidosUseCase } from '../application/use-cases/pedido/list-pedidos.use-case';
import { PrepararPedidoUseCase } from '../application/use-cases/pedido/preparar-pedido.use-case';
import { ResumirPedidoPortalUseCase } from '../application/use-cases/pedido/resumir-pedido-portal.use-case';
import { AprobarReembolsoUseCase } from '../application/use-cases/reembolso/aprobar-reembolso.use-case';
import { ConfirmarDevolucionReembolsoUseCase } from '../application/use-cases/reembolso/confirmar-devolucion-reembolso.use-case';
import { GetReembolsoByIdUseCase } from '../application/use-cases/reembolso/get-reembolso-by-id.use-case';
import { ListReembolsosUseCase } from '../application/use-cases/reembolso/list-reembolsos.use-case';
import { RechazarReembolsoUseCase } from '../application/use-cases/reembolso/rechazar-reembolso.use-case';
import { SolicitarReembolsoUseCase } from '../application/use-cases/reembolso/solicitar-reembolso.use-case';
import { ListMisReembolsosUseCase } from '../application/use-cases/reembolso/list-mis-reembolsos.use-case';
import { GetMiReembolsoUseCase } from '../application/use-cases/reembolso/get-mi-reembolso.use-case';
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
import { DespachoPedidosController } from './controllers/despacho-pedidos.controller';
import { InventarioPedidosController } from './controllers/inventario-pedidos.controller';
import { PedidosController } from './controllers/pedidos.controller';
import { PortalPedidosController } from './controllers/portal-pedidos.controller';
import { PortalReembolsosController } from './controllers/portal-reembolsos.controller';
import { ReembolsosController } from './controllers/reembolsos.controller';
import { SeriesComprobanteController } from './controllers/series-comprobante.controller';
import { SalesDomainExceptionFilter } from './filters/sales-domain-exception.filter';

@Module({
  imports: [InventoryModule],
  controllers: [
    PedidosController,
    SeriesComprobanteController,
    DespachoPedidosController,
    InventarioPedidosController,
    ReembolsosController,
    PortalPedidosController,
    PortalReembolsosController,
  ],
  providers: [
    CreatePedidoUseCase,
    ListPedidosUseCase,
    GetPedidoByIdUseCase,
    ActualizarEstadoPedidoUseCase,
    CompletarPedidoUseCase,
    ResumirPedidoPortalUseCase,
    ListPedidosDespachoUseCase,
    GetPedidoDespachoUseCase,
    DespacharPedidoUseCase,
    ListPedidosInventarioUseCase,
    GetPedidoInventarioUseCase,
    GetIndicadoresPedidosInventarioUseCase,
    PrepararPedidoUseCase,
    EntregarPedidoADespachoUseCase,
    ListReembolsosUseCase,
    GetReembolsoByIdUseCase,
    AprobarReembolsoUseCase,
    RechazarReembolsoUseCase,
    ConfirmarDevolucionReembolsoUseCase,
    SolicitarReembolsoUseCase,
    ListMisReembolsosUseCase,
    GetMiReembolsoUseCase,
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
  // DespachoPedidosController (HU-A-023) marca con él los pedidos como entregados;
  // ReservarCorrelativoUseCase es el servicio interno para la emisión de
  // comprobantes (OFT0-541), sin HTTP.
  exports: [CompletarPedidoUseCase, ReservarCorrelativoUseCase],
})
export class SalesModule {}
