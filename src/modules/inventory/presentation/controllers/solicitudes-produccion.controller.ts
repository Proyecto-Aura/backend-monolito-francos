import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../auth/presentation/strategies/jwt.strategy';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { ActualizarFechaLimiteSolicitudProduccionDto } from '../../application/dto/solicitud-produccion-dtos/actualizar-fecha-limite-solicitud-produccion.dto';
import { CambiarEstadoSolicitudProduccionDto } from '../../application/dto/solicitud-produccion-dtos/cambiar-estado-solicitud-produccion.dto';
import { CreateSolicitudProduccionDto } from '../../application/dto/solicitud-produccion-dtos/create-solicitud-produccion.dto';
import { ListSolicitudProduccionQueryDto } from '../../application/dto/solicitud-produccion-dtos/list-solicitud-produccion-query.dto';
import { ActualizarDetalleLineaDto } from '../../application/dto/solicitud-produccion-detalle-dtos/actualizar-detalle-linea.dto';
import { CrearDetalleLineaDto } from '../../application/dto/solicitud-produccion-detalle-dtos/crear-detalle-linea.dto';
import { AgregarDetalleLineaUseCase } from '../../application/use-cases/solicitud-produccion-detalle/agregar-detalle-linea.use-case';
import { ActualizarDetalleLineaUseCase } from '../../application/use-cases/solicitud-produccion-detalle/actualizar-detalle-linea.use-case';
import { EliminarDetalleLineaUseCase } from '../../application/use-cases/solicitud-produccion-detalle/eliminar-detalle-linea.use-case';
import { ActualizarFechaLimiteSolicitudProduccionUseCase } from '../../application/use-cases/solicitud-produccion/actualizar-fecha-limite-solicitud-produccion.use-case';
import { CambiarEstadoSolicitudProduccionUseCase } from '../../application/use-cases/solicitud-produccion/cambiar-estado-solicitud-produccion.use-case';
import { CreateSolicitudProduccionUseCase } from '../../application/use-cases/solicitud-produccion/create-solicitud-produccion.use-case';
import { GetIndicadoresSolicitudProduccionUseCase } from '../../application/use-cases/solicitud-produccion/get-indicadores-solicitud-produccion.use-case';
import { GetSolicitudProduccionByIdUseCase } from '../../application/use-cases/solicitud-produccion/get-solicitud-produccion-by-id.use-case';
import { ListSolicitudesProduccionUseCase } from '../../application/use-cases/solicitud-produccion/list-solicitudes-produccion.use-case';
import { SolicitudProduccionDetallePresenter } from '../presenters/solicitud-produccion-detalle.presenter';
import { SolicitudProduccionPresenter } from '../presenters/solicitud-produccion.presenter';

// Solicitud de producción interna (OFT0-261): admin/inventario la crean y
// pueden rechazarla mientras está pendiente; producción la mueve a
// en_proceso/entregado (o la rechaza, también solo desde pendiente). No
// toca stock directamente — eso es un flujo aparte.
@ApiTags('Solicitudes de producción')
@ApiBearerAuth()
@Controller('solicitudes-produccion')
export class SolicitudesProduccionController {
  constructor(
    private readonly createSolicitudProduccion: CreateSolicitudProduccionUseCase,
    private readonly getSolicitudProduccionById: GetSolicitudProduccionByIdUseCase,
    private readonly listSolicitudesProduccion: ListSolicitudesProduccionUseCase,
    private readonly cambiarEstadoSolicitudProduccion: CambiarEstadoSolicitudProduccionUseCase,
    private readonly actualizarFechaLimiteSolicitudProduccion: ActualizarFechaLimiteSolicitudProduccionUseCase,
    private readonly getIndicadoresSolicitudProduccion: GetIndicadoresSolicitudProduccionUseCase,
    private readonly agregarDetalleLinea: AgregarDetalleLineaUseCase,
    private readonly actualizarDetalleLinea: ActualizarDetalleLineaUseCase,
    private readonly eliminarDetalleLinea: EliminarDetalleLineaUseCase,
  ) {}

  @Roles('admin', 'inventario')
  @Post()
  @ApiOperation({
    summary:
      'Crear una solicitud de producción con su detalle (array de producto_terminado_id + cantidad_solicitada)',
  })
  async create(
    @Body() dto: CreateSolicitudProduccionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return SolicitudProduccionPresenter.toHttp(
      await this.createSolicitudProduccion.execute(dto, user.userId),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get()
  @ApiOperation({ summary: 'Listar solicitudes de producción' })
  @ApiOkResponse({ description: 'Lista paginada de solicitudes' })
  async findAll(@Query() query: ListSolicitudProduccionQueryDto) {
    return SolicitudProduccionPresenter.paginatedToHttp(
      await this.listSolicitudesProduccion.execute(query),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get('indicadores')
  @ApiOperation({
    summary: 'Conteo de solicitudes de producción por estado',
  })
  @ApiOkResponse({
    description: 'KPIs: pendiente, en_proceso, entregado, rechazado, total',
  })
  async indicadores() {
    return this.getIndicadoresSolicitudProduccion.execute();
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una solicitud de producción con su detalle',
  })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return SolicitudProduccionPresenter.conDetalleToHttp(
      await this.getSolicitudProduccionById.execute(id),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Patch(':id/estado')
  @ApiOperation({
    summary:
      'Cambiar el estado de la solicitud. admin/inventario solo pueden rechazar (y solo desde pendiente); producción puede pasar a en_proceso/entregado/rechazado.',
  })
  @ApiParam({ name: 'id', type: Number })
  async cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoSolicitudProduccionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return SolicitudProduccionPresenter.toHttp(
      await this.cambiarEstadoSolicitudProduccion.execute(
        id,
        dto.estado,
        user.roles,
      ),
    );
  }

  @Roles('admin', 'inventario')
  @Patch(':id')
  @ApiOperation({
    summary:
      'Actualizar la fecha límite (solo mientras la solicitud está pendiente)',
  })
  @ApiParam({ name: 'id', type: Number })
  async actualizarFechaLimite(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarFechaLimiteSolicitudProduccionDto,
  ) {
    return SolicitudProduccionPresenter.toHttp(
      await this.actualizarFechaLimiteSolicitudProduccion.execute(id, dto),
    );
  }

  @Roles('admin', 'inventario')
  @Post(':id/detalle')
  @ApiOperation({
    summary:
      'Agregar una línea al detalle (solo mientras la solicitud está pendiente)',
  })
  @ApiParam({ name: 'id', type: Number })
  async agregarDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearDetalleLineaDto,
  ) {
    return SolicitudProduccionDetallePresenter.toHttp(
      await this.agregarDetalleLinea.execute(id, dto),
    );
  }

  @Roles('admin', 'inventario')
  @Patch('detalle/:detalleId')
  @ApiOperation({
    summary:
      'Actualizar la cantidad de una línea (solo mientras la solicitud está pendiente)',
  })
  @ApiParam({ name: 'detalleId', type: Number })
  async actualizarDetalle(
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Body() dto: ActualizarDetalleLineaDto,
  ) {
    return SolicitudProduccionDetallePresenter.toHttp(
      await this.actualizarDetalleLinea.execute(detalleId, dto),
    );
  }

  @Roles('admin', 'inventario')
  @Delete('detalle/:detalleId')
  @ApiOperation({
    summary:
      'Quitar una línea del detalle (solo mientras la solicitud está pendiente; debe quedar al menos una)',
  })
  @ApiParam({ name: 'detalleId', type: Number })
  async eliminarDetalle(@Param('detalleId', ParseIntPipe) detalleId: number) {
    await this.eliminarDetalleLinea.execute(detalleId);
  }
}
