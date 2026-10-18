import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../auth/presentation/strategies/jwt.strategy';
import { CreatePedidoDto } from '../../application/dto/pedido-dtos/create-pedido.dto';
import { ListPedidosQueryDto } from '../../application/dto/pedido-dtos/list-pedidos-query.dto';
import { CreatePedidoUseCase } from '../../application/use-cases/pedido/create-pedido.use-case';
import { GetPedidoByIdUseCase } from '../../application/use-cases/pedido/get-pedido-by-id.use-case';
import { ListPedidosUseCase } from '../../application/use-cases/pedido/list-pedidos.use-case';
import { PedidoPresenter } from '../presenters/pedido.presenter';

@ApiTags('Pedidos')
@ApiBearerAuth()
@Roles('admin', 'ventas')
@Controller('pedidos')
export class PedidosController {
  constructor(
    private readonly createPedido: CreatePedidoUseCase,
    private readonly listPedidos: ListPedidosUseCase,
    private readonly getPedidoById: GetPedidoByIdUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar un pedido manualmente',
    description:
      'Calcula precios y total, y genera el código PED-000001. Con Culqi cobra primero con el token del checkout: si Culqi rechaza el pago, el pedido no se registra (402). Con efectivo se registra como ya cobrado.',
  })
  @ApiCreatedResponse({ description: 'Pedido registrado y confirmado' })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos: sin productos, presentación repetida, delivery sin dirección o Culqi sin token',
  })
  @ApiNotFoundResponse({
    description: 'El cliente o una presentación no existe',
  })
  @ApiConflictResponse({
    description:
      'El cliente está inactivo o sin correo (Culqi), o una presentación está desactivada',
  })
  @ApiResponse({
    status: 402,
    description:
      'Culqi rechazó el pago; el mensaje es el que Culqi da para el cliente y el pedido no se registra',
  })
  @ApiServiceUnavailableResponse({
    description:
      'Culqi no está configurado o no respondió; el pedido no se registra',
  })
  async create(
    @Body() dto: CreatePedidoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return PedidoPresenter.detalleToHttp(
      await this.createPedido.execute(dto, user.userId),
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar pedidos en orden de llegada',
    description: 'Filtra por estado, origen y rango de fechas de creación.',
  })
  @ApiOkResponse({ description: 'Lista paginada de pedidos' })
  @ApiBadRequestResponse({
    description: 'Filtro inválido o fecha desde posterior a fecha hasta',
  })
  async findAll(@Query() query: ListPedidosQueryDto) {
    return PedidoPresenter.paginatedToHttp(
      await this.listPedidos.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ver el detalle de un pedido con sus productos y su pago',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Pedido con sus productos y su pago' })
  @ApiNotFoundResponse({ description: 'El pedido no existe' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return PedidoPresenter.detalleToHttp(await this.getPedidoById.execute(id));
  }
}
