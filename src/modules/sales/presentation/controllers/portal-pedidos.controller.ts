import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../auth/presentation/strategies/jwt.strategy';
import { ResumenPedidoPortalDto } from '../../application/dto/pedido-dtos/resumen-pedido-portal.dto';
import { ResumirPedidoPortalUseCase } from '../../application/use-cases/pedido/resumir-pedido-portal.use-case';
import { ResumenPedidoPortalPresenter } from '../presenters/resumen-pedido-portal.presenter';

@ApiTags('Portal - Pedidos')
@ApiBearerAuth()
@Roles('cliente')
@Controller('portal/pedidos')
export class PortalPedidosController {
  constructor(
    private readonly resumirPedidoPortal: ResumirPedidoPortalUseCase,
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
}
