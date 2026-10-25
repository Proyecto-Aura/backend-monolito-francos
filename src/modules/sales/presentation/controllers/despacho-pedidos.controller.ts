import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { ListPedidosDespachoQueryDto } from '../../application/dto/pedido-dtos/list-pedidos-despacho-query.dto';
import { CompletarPedidoUseCase } from '../../application/use-cases/pedido/completar-pedido.use-case';
import { DespacharPedidoUseCase } from '../../application/use-cases/pedido/despachar-pedido.use-case';
import { GetPedidoDespachoUseCase } from '../../application/use-cases/pedido/get-pedido-despacho.use-case';
import { ListPedidosDespachoUseCase } from '../../application/use-cases/pedido/list-pedidos-despacho.use-case';
import { PedidoPresenter } from '../presenters/pedido.presenter';

// HU-A-023: módulo de despacho. Ventas no despacha (RN6).
@ApiTags('Despacho')
@ApiBearerAuth()
@Roles('admin', 'despacho')
@Controller('despacho/pedidos')
export class DespachoPedidosController {
  constructor(
    private readonly listPedidosDespacho: ListPedidosDespachoUseCase,
    private readonly getPedidoDespacho: GetPedidoDespachoUseCase,
    private readonly despacharPedido: DespacharPedidoUseCase,
    private readonly completarPedido: CompletarPedidoUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar los pedidos de despacho en orden de llegada',
    description:
      'Solo pedidos pendiente_entrega, en_camino y entregado (RF-A094). Se puede filtrar por uno de esos estados.',
  })
  @ApiOkResponse({ description: 'Lista paginada de pedidos' })
  @ApiBadRequestResponse({
    description: 'El estado no es uno de los de despacho',
  })
  async findAll(@Query() query: ListPedidosDespachoQueryDto) {
    return PedidoPresenter.paginatedToHttp(
      await this.listPedidosDespacho.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ver el detalle de un pedido de despacho',
    description: 'RF-A095. Los pedidos en otros estados responden 404.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Pedido con sus productos y su pago' })
  @ApiNotFoundResponse({
    description: 'El pedido no existe o no está en un estado de despacho',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return PedidoPresenter.detalleToHttp(
      await this.getPedidoDespacho.execute(id),
    );
  }

  @Patch(':id/en-camino')
  @ApiOperation({
    summary: 'Sacar a reparto un pedido pendiente de entrega',
    description:
      'Pasa el pedido de pendiente_entrega a en_camino y notifica al cliente en el portal si tiene usuario (RF-A096, RF-A097).',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Pedido en camino' })
  @ApiNotFoundResponse({ description: 'El pedido no existe' })
  @ApiConflictResponse({
    description:
      'El pedido no está pendiente de entrega, o cambió de estado mientras tanto',
  })
  async marcarEnCamino(@Param('id', ParseIntPipe) id: number) {
    return PedidoPresenter.detalleToHttp(
      await this.despacharPedido.execute(id),
    );
  }

  @Patch(':id/entregado')
  @ApiOperation({
    summary: 'Marcar como entregado un pedido en camino',
    description:
      'Guarda la fecha de entrega y descuenta el stock de productos terminados en la misma transacción (RF-A098, RF-A036).',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Pedido entregado' })
  @ApiNotFoundResponse({ description: 'El pedido no existe' })
  @ApiConflictResponse({
    description:
      'El pedido no está en camino, o no hay stock suficiente; nada cambia',
  })
  async marcarEntregado(@Param('id', ParseIntPipe) id: number) {
    await this.completarPedido.execute(id);
    return PedidoPresenter.detalleToHttp(
      await this.getPedidoDespacho.execute(id),
    );
  }
}
