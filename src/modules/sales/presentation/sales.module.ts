import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ActualizarEstadoPedidoUseCase } from '../application/use-cases/pedido/actualizar-estado-pedido.use-case';
import { CompletarPedidoUseCase } from '../application/use-cases/pedido/completar-pedido.use-case';
import { CreatePedidoUseCase } from '../application/use-cases/pedido/create-pedido.use-case';
import { DespacharPedidoUseCase } from '../application/use-cases/pedido/despachar-pedido.use-case';
import { GetPedidoByIdUseCase } from '../application/use-cases/pedido/get-pedido-by-id.use-case';
import { GetPedidoDespachoUseCase } from '../application/use-cases/pedido/get-pedido-despacho.use-case';
import { ListPedidosDespachoUseCase } from '../application/use-cases/pedido/list-pedidos-despacho.use-case';
import { ListPedidosUseCase } from '../application/use-cases/pedido/list-pedidos.use-case';
import { AprobarReembolsoUseCase } from '../application/use-cases/reembolso/aprobar-reembolso.use-case';
import { ConfirmarDevolucionReembolsoUseCase } from '../application/use-cases/reembolso/confirmar-devolucion-reembolso.use-case';
import { GetReembolsoByIdUseCase } from '../application/use-cases/reembolso/get-reembolso-by-id.use-case';
import { ListReembolsosUseCase } from '../application/use-cases/reembolso/list-reembolsos.use-case';
import { RechazarReembolsoUseCase } from '../application/use-cases/reembolso/rechazar-reembolso.use-case';
import { PedidoRepository } from '../domain/repositories/pedido.repository';
import { ReembolsoRepository } from '../domain/repositories/reembolso.repository';
import { EvidenciaReembolsoService } from '../domain/services/evidencia-reembolso.service';
import { PasarelaPagoService } from '../domain/services/pasarela-pago.service';
import { CulqiPasarelaPagoService } from '../infrastructure/payment/culqi-pasarela-pago.service';
import { PrismaPedidoRepository } from '../infrastructure/repositories/prisma-pedido.repository';
import { PrismaReembolsoRepository } from '../infrastructure/repositories/prisma-reembolso.repository';
import { S3EvidenciaReembolsoService } from '../infrastructure/storage/s3-evidencia-reembolso.service';
import { DespachoPedidosController } from './controllers/despacho-pedidos.controller';
import { PedidosController } from './controllers/pedidos.controller';
import { ReembolsosController } from './controllers/reembolsos.controller';
import { SalesDomainExceptionFilter } from './filters/sales-domain-exception.filter';

@Module({
  controllers: [
    PedidosController,
    DespachoPedidosController,
    ReembolsosController,
  ],
  providers: [
    CreatePedidoUseCase,
    ListPedidosUseCase,
    GetPedidoByIdUseCase,
    ActualizarEstadoPedidoUseCase,
    CompletarPedidoUseCase,
    ListPedidosDespachoUseCase,
    GetPedidoDespachoUseCase,
    DespacharPedidoUseCase,
    ListReembolsosUseCase,
    GetReembolsoByIdUseCase,
    AprobarReembolsoUseCase,
    RechazarReembolsoUseCase,
    ConfirmarDevolucionReembolsoUseCase,
    { provide: PedidoRepository, useClass: PrismaPedidoRepository },
    { provide: ReembolsoRepository, useClass: PrismaReembolsoRepository },
    { provide: PasarelaPagoService, useClass: CulqiPasarelaPagoService },
    {
      provide: EvidenciaReembolsoService,
      useClass: S3EvidenciaReembolsoService,
    },
    {
      provide: APP_FILTER,
      useClass: SalesDomainExceptionFilter,
    },
  ],
  // DespachoPedidosController (HU-A-023) marca con él los pedidos como entregados.
  exports: [CompletarPedidoUseCase],
})
export class SalesModule {}
