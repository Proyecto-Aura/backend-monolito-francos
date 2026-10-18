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
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../auth/presentation/strategies/jwt.strategy';
import { ListReembolsosQueryDto } from '../../application/dto/reembolso-dtos/list-reembolsos-query.dto';
import { RechazarReembolsoDto } from '../../application/dto/reembolso-dtos/rechazar-reembolso.dto';
import { AprobarReembolsoUseCase } from '../../application/use-cases/reembolso/aprobar-reembolso.use-case';
import { ConfirmarDevolucionReembolsoUseCase } from '../../application/use-cases/reembolso/confirmar-devolucion-reembolso.use-case';
import { GetReembolsoByIdUseCase } from '../../application/use-cases/reembolso/get-reembolso-by-id.use-case';
import { ListReembolsosUseCase } from '../../application/use-cases/reembolso/list-reembolsos.use-case';
import { RechazarReembolsoUseCase } from '../../application/use-cases/reembolso/rechazar-reembolso.use-case';
import { ReembolsoPresenter } from '../presenters/reembolso.presenter';

@ApiTags('Reembolsos')
@ApiBearerAuth()
@Roles('admin', 'ventas')
@Controller('reembolsos')
export class ReembolsosController {
  constructor(
    private readonly listReembolsos: ListReembolsosUseCase,
    private readonly getReembolsoById: GetReembolsoByIdUseCase,
    private readonly aprobarReembolso: AprobarReembolsoUseCase,
    private readonly rechazarReembolso: RechazarReembolsoUseCase,
    private readonly confirmarDevolucion: ConfirmarDevolucionReembolsoUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar las solicitudes de reembolso de los clientes',
    description:
      'Las más recientes primero. Filtra por estado, rango de fechas de solicitud y texto (código de solicitud, código de pedido o cliente).',
  })
  @ApiOkResponse({ description: 'Lista paginada de solicitudes' })
  @ApiBadRequestResponse({
    description: 'Filtro inválido o fecha desde posterior a fecha hasta',
  })
  async findAll(@Query() query: ListReembolsosQueryDto) {
    return ReembolsoPresenter.paginatedToHttp(
      await this.listReembolsos.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ver el detalle de una solicitud de reembolso',
    description:
      'Incluye el motivo del cliente, la evidencia (con un enlace de descarga que vence a los 5 minutos) y el monto a devolver.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Solicitud con su pedido, motivo y evidencia' })
  @ApiNotFoundResponse({ description: 'La solicitud no existe' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return ReembolsoPresenter.detalleToHttp(
      await this.getReembolsoById.execute(id),
    );
  }

  @Patch(':id/aprobar')
  @ApiOperation({
    summary: 'Aprobar una solicitud de reembolso',
    description:
      'Solo una solicitud pendiente con motivo y evidencia. Pasa a aprobado y se notifica al cliente (RF-A042, RF-A045).',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Solicitud aprobada' })
  @ApiNotFoundResponse({ description: 'La solicitud no existe' })
  @ApiConflictResponse({
    description:
      'La solicitud no está pendiente, no tiene evidencia, o cambió de estado mientras tanto',
  })
  async aprobar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ReembolsoPresenter.detalleToHttp(
      await this.aprobarReembolso.execute(id, user.userId),
    );
  }

  @Patch(':id/rechazar')
  @ApiOperation({
    summary: 'Rechazar una solicitud de reembolso',
    description:
      'Solo una solicitud pendiente y con motivo obligatorio. Pasa a rechazado sin vuelta atrás y se notifica al cliente con el motivo (RF-A043, RF-A045).',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Solicitud rechazada' })
  @ApiBadRequestResponse({ description: 'Falta el motivo del rechazo' })
  @ApiNotFoundResponse({ description: 'La solicitud no existe' })
  @ApiConflictResponse({
    description:
      'La solicitud no está pendiente, o cambió de estado mientras tanto',
  })
  async rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarReembolsoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ReembolsoPresenter.detalleToHttp(
      await this.rechazarReembolso.execute(id, dto.motivo_rechazo, user.userId),
    );
  }

  @Patch(':id/confirmar-devolucion')
  @ApiOperation({
    summary: 'Registrar la confirmación de Culqi de la devolución (simulada)',
    description:
      'Para una solicitud aprobada de un pago con Culqi: pasa a reembolsado y se notifica al cliente (RF-A044, RF-A045). Sin llaves de Culqi la confirmación es simulada y no se llama a Culqi.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Solicitud reembolsada' })
  @ApiNotFoundResponse({ description: 'La solicitud no existe' })
  @ApiConflictResponse({
    description:
      'El pago no fue con Culqi, la solicitud no está aprobada, o cambió de estado mientras tanto',
  })
  async confirmarDevolucionCulqi(@Param('id', ParseIntPipe) id: number) {
    return ReembolsoPresenter.detalleToHttp(
      await this.confirmarDevolucion.execute(id),
    );
  }
}
