import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ActualizarEstadoPedidoUseCase } from '../application/use-cases/pedido/actualizar-estado-pedido.use-case';
import { CompletarPedidoUseCase } from '../application/use-cases/pedido/completar-pedido.use-case';
import { CreatePedidoUseCase } from '../application/use-cases/pedido/create-pedido.use-case';
import { GetPedidoByIdUseCase } from '../application/use-cases/pedido/get-pedido-by-id.use-case';
import { ListPedidosUseCase } from '../application/use-cases/pedido/list-pedidos.use-case';
import { PedidoRepository } from '../domain/repositories/pedido.repository';
import { PasarelaPagoService } from '../domain/services/pasarela-pago.service';
import { CulqiPasarelaPagoService } from '../infrastructure/payment/culqi-pasarela-pago.service';
import { PrismaPedidoRepository } from '../infrastructure/repositories/prisma-pedido.repository';
import { PedidosController } from './controllers/pedidos.controller';
import { SalesDomainExceptionFilter } from './filters/sales-domain-exception.filter';

@Module({
  controllers: [PedidosController],
  providers: [
    CreatePedidoUseCase,
    ListPedidosUseCase,
    GetPedidoByIdUseCase,
    ActualizarEstadoPedidoUseCase,
    CompletarPedidoUseCase,
    { provide: PedidoRepository, useClass: PrismaPedidoRepository },
    { provide: PasarelaPagoService, useClass: CulqiPasarelaPagoService },
    {
      provide: APP_FILTER,
      useClass: SalesDomainExceptionFilter,
    },
  ],
  // La HU de despacho (HU-A-023) marcará los pedidos como entregados con este caso de uso.
  exports: [CompletarPedidoUseCase],
})
export class SalesModule {}
