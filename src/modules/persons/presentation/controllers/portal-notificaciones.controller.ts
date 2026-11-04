import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../auth/presentation/strategies/jwt.strategy';
import { ListNotificacionesQueryDto } from '../../application/dto/notificacion-dtos/list-notificaciones-query.dto';
import { ListNotificacionesUseCase } from '../../application/use-cases/notificaciones/list-notificaciones.use-case';
import { MarcarNotificacionLeidaUseCase } from '../../application/use-cases/notificaciones/marcar-notificacion-leida.use-case';
import { NotificacionPresenter } from '../presenters/notificacion.presenter';

@ApiTags('Portal - Notificaciones')
@ApiBearerAuth()
@Roles('cliente')
@Controller('portal/notificaciones')
export class PortalNotificacionesController {
  constructor(
    private readonly listNotificaciones: ListNotificacionesUseCase,
    private readonly marcarLeida: MarcarNotificacionLeidaUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar mis notificaciones',
    description: 'Las más recientes primero. Filtra por leídas o pendientes.',
  })
  @ApiOkResponse({ description: 'Lista paginada de mis notificaciones' })
  async findAll(
    @Query() query: ListNotificacionesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return NotificacionPresenter.paginatedToHttp(
      await this.listNotificaciones.execute(query, user.userId),
    );
  }

  @Patch(':id/leida')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Notificación marcada como leída' })
  @ApiNotFoundResponse({
    description: 'No existe, no es tuya, o ya estaba leída',
  })
  async marcar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.marcarLeida.execute(id, user.userId);
    return { marcada: true };
  }
}
