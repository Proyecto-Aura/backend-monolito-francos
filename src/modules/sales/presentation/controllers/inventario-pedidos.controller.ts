import {
  Body,
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
import { EntregarPedidoADespachoDto } from '../../application/dto/pedido-dtos/entregar-pedido-despacho.dto';
import { ListPedidosInventarioQueryDto } from '../../application/dto/pedido-dtos/list-pedidos-inventario-query.dto';
import { EntregarPedidoADespachoUseCase } from '../../application/use-cases/pedido/entregar-pedido-a-despacho.use-case';
import { GetIndicadoresPedidosInventarioUseCase } from '../../application/use-cases/pedido/get-indicadores-pedidos-inventario.use-case';
import { GetPedidoInventarioUseCase } from '../../application/use-cases/pedido/get-pedido-inventario.use-case';
import { ListPedidosInventarioUseCase } from '../../application/use-cases/pedido/list-pedidos-inventario.use-case';
import { PrepararPedidoUseCase } from '../../application/use-cases/pedido/preparar-pedido.use-case';
import { PedidoPresenter } from '../presenters/pedido.presenter';

// Pedidos por preparar: el operario de productos terminados ve y avanza los
// pedidos que ventas ya puso en espera de inventario (RN6).
@ApiTags('Inventario - Pedidos')
@ApiBearerAuth()
@Roles('admin', 'inventario')
@Controller('inventario/pedidos')
export class InventarioPedidosController {
  constructor(
    private readonly listPedidosInventario: ListPedidosInventarioUseCase,
    private readonly getPedidoInventario: GetPedidoInventarioUseCase,
    private readonly getIndicadoresPedidosInventario: GetIndicadoresPedidosInventarioUseCase,
    private readonly prepararPedido: PrepararPedidoUseCase,
    private readonly entregarPedidoADespacho: EntregarPedidoADespachoUseCase,
  ) {}

  @Get('indicadores')
  @ApiOperation({
    summary: 'Conteo de pedidos por preparar, por estado',
  })
  @ApiOkResponse({
    description:
      'Conteo de en_espera_inventario, en_preparacion y pendiente_entrega',
  })
  async indicadores() {
    return this.getIndicadoresPedidosInventario.execute();
  }

  @Get()
  @ApiOperation({
    summary: 'Listar los pedidos por preparar',
    description:
      'Solo pedidos en_espera_inventario, en_preparacion y pendiente_entrega. Filtra por estado, búsqueda (código o cliente) y fecha.',
  })
  @ApiOkResponse({ description: 'Lista paginada de pedidos' })
  @ApiBadRequestResponse({ description: 'El estado no es uno de inventario' })
  async findAll(@Query() query: ListPedidosInventarioQueryDto) {
    return PedidoPresenter.paginatedToHttp(
      await this.listPedidosInventario.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver el detalle de un pedido por preparar' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Pedido con sus productos y su pago' })
  @ApiNotFoundResponse({
    description: 'El pedido no existe o no está en un estado de inventario',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return PedidoPresenter.detalleInventarioToHttp(
      await this.getPedidoInventario.execute(id),
    );
  }

  @Patch(':id/en-preparacion')
  @ApiOperation({
    summary: 'Empezar a preparar un pedido en espera de inventario',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Pedido en preparación' })
  @ApiNotFoundResponse({ description: 'El pedido no existe' })
  @ApiConflictResponse({
    description:
      'El pedido no está en espera de inventario, o cambió de estado mientras tanto',
  })
  async marcarEnPreparacion(@Param('id', ParseIntPipe) id: number) {
    return PedidoPresenter.detalleInventarioToHttp(
      await this.prepararPedido.execute(id),
    );
  }

  @Patch(':id/pendiente-entrega')
  @ApiOperation({
    summary: 'Entregar a despacho un pedido en preparación',
    description:
      'Registra la salida de inventario (FEFO) de lo realmente preparado y cambia el estado',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Pedido listo para despacho' })
  @ApiNotFoundResponse({ description: 'El pedido no existe' })
  @ApiBadRequestResponse({
    description: 'Los items preparados no coinciden con los del pedido',
  })
  @ApiConflictResponse({
    description:
      'El pedido no está en preparación, cambió de estado mientras tanto, o no hay stock suficiente',
  })
  async marcarPendienteEntrega(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EntregarPedidoADespachoDto,
  ) {
    return PedidoPresenter.detalleInventarioToHttp(
      await this.entregarPedidoADespacho.execute(id, dto.items),
    );
  }
}
