import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../auth/presentation/strategies/jwt.strategy';
import { CrearPedidoPortalDto } from '../../application/dto/pedido-dtos/crear-pedido-portal.dto';
import { ResumenPedidoPortalDto } from '../../application/dto/pedido-dtos/resumen-pedido-portal.dto';
import { CrearPedidoPortalUseCase } from '../../application/use-cases/pedido/crear-pedido-portal.use-case';
import { ResumirPedidoPortalUseCase } from '../../application/use-cases/pedido/resumir-pedido-portal.use-case';
import { PedidoPresenter } from '../presenters/pedido.presenter';
import { ResumenPedidoPortalPresenter } from '../presenters/resumen-pedido-portal.presenter';

@ApiTags('Portal - Pedidos')
@ApiBearerAuth()
@Roles('cliente')
@Controller('portal/pedidos')
export class PortalPedidosController {
  constructor(
    private readonly resumirPedidoPortal: ResumirPedidoPortalUseCase,
    private readonly crearPedidoPortal: CrearPedidoPortalUseCase,
  ) {}

  @Post('resumen')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Confirmar el carrito y calcular el resumen del pedido',
    description:
      'Recalcula en el servidor el subtotal por línea y el total con el precio mayorista cuando la cantidad supera el umbral (RN17). Devuelve la dirección del perfil y la de entrega, y el tipo de comprobante elegido (boleta por defecto; factura con RUC y razón social). Si el perfil tiene RUC, propone sus datos en comprobante_sugerido. No registra el pedido ni cobra.',
  })
  @ApiOkResponse({ description: 'Resumen del pedido con sus montos' })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos: sin productos, presentación repetida, cantidad menor a 1, delivery sin dirección, tipo de comprobante desconocido, o factura sin RUC válido o sin razón social',
  })
  @ApiNotFoundResponse({
    description: 'El usuario no tiene un cliente o una presentación no existe',
  })
  @ApiConflictResponse({
    description:
      'El cliente está inactivo, o una presentación está desactivada o no se muestra en el portal',
  })
  async resumen(
    @Body() dto: ResumenPedidoPortalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ResumenPedidoPortalPresenter.toHttp(
      await this.resumirPedidoPortal.execute(dto, user.userId),
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Pagar el carrito y crear el pedido',
    description:
      'Recalcula el total en el servidor (igual que el resumen) y cobra con el token del checkout de Culqi (tarjeta, Yape o Plin). Solo si el pago se confirma se guarda el pedido ya pagado (RN5) y se avisa al cliente. Si el pago se rechaza responde 402, no se guarda nada y el cliente puede reintentar con otro token sin duplicar el pedido.',
  })
  @ApiCreatedResponse({ description: 'Pedido creado y pago confirmado' })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos: sin productos, presentación repetida, delivery sin dirección o falta el token de pago',
  })
  @ApiNotFoundResponse({
    description: 'El usuario no tiene un cliente o una presentación no existe',
  })
  @ApiConflictResponse({
    description:
      'El cliente está inactivo o sin correo, o una presentación no está disponible',
  })
  @ApiResponse({
    status: 402,
    description:
      'La pasarela rechazó el pago; el pedido no se registra y se puede reintentar',
  })
  @ApiServiceUnavailableResponse({
    description:
      'La pasarela no está configurada o no respondió; el pedido no se registra',
  })
  async crear(
    @Body() dto: CrearPedidoPortalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return PedidoPresenter.detalleToHttp(
      await this.crearPedidoPortal.execute(dto, user.userId),
    );
  }
}
