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
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../auth/presentation/strategies/jwt.strategy';
import { ActualizarFechaLimiteSolicitudInsumosDto } from '../../application/dto/solicitud-insumos-dtos/actualizar-fecha-limite-solicitud-insumos.dto';
import { CambiarEstadoSolicitudInsumosDto } from '../../application/dto/solicitud-insumos-dtos/cambiar-estado-solicitud-insumos.dto';
import { CreateSolicitudInsumosDto } from '../../application/dto/solicitud-insumos-dtos/create-solicitud-insumos.dto';
import { ListSolicitudInsumosQueryDto } from '../../application/dto/solicitud-insumos-dtos/list-solicitud-insumos-query.dto';
import { ActualizarDetalleLineaInsumoDto } from '../../application/dto/solicitud-insumos-detalle-dtos/actualizar-detalle-linea.dto';
import { CrearDetalleLineaInsumoDto } from '../../application/dto/solicitud-insumos-detalle-dtos/crear-detalle-linea.dto';
import { AgregarDetalleLineaInsumoUseCase } from '../../application/use-cases/solicitud-insumos-detalle/agregar-detalle-linea.use-case';
import { ActualizarDetalleLineaInsumoUseCase } from '../../application/use-cases/solicitud-insumos-detalle/actualizar-detalle-linea.use-case';
import { EliminarDetalleLineaInsumoUseCase } from '../../application/use-cases/solicitud-insumos-detalle/eliminar-detalle-linea.use-case';
import { ActualizarFechaLimiteSolicitudInsumosUseCase } from '../../application/use-cases/solicitud-insumos/actualizar-fecha-limite-solicitud-insumos.use-case';
import { CambiarEstadoSolicitudInsumosUseCase } from '../../application/use-cases/solicitud-insumos/cambiar-estado-solicitud-insumos.use-case';
import { CreateSolicitudInsumosUseCase } from '../../application/use-cases/solicitud-insumos/create-solicitud-insumos.use-case';
import { GetIndicadoresSolicitudInsumosUseCase } from '../../application/use-cases/solicitud-insumos/get-indicadores-solicitud-insumos.use-case';
import { GetSolicitudInsumosByIdUseCase } from '../../application/use-cases/solicitud-insumos/get-solicitud-insumos-by-id.use-case';
import { ListSolicitudesInsumosUseCase } from '../../application/use-cases/solicitud-insumos/list-solicitudes-insumos.use-case';
import { SolicitudInsumosDetallePresenter } from '../presenters/solicitud-insumos-detalle.presenter';
import { SolicitudInsumosPresenter } from '../presenters/solicitud-insumos.presenter';

// Solicitud de insumos (OFT0-264): espejo de solicitud de producción con los
// roles invertidos. Producción la crea y edita (puede rechazarla mientras
// está pendiente); inventario la avanza a en_proceso/entregado, porque es
// quien maneja insumos y lotes. Al entregar, se descuenta stock de verdad
// (salida FEFO por cada línea, ver CambiarEstadoSolicitudInsumosUseCase).
// Admin tiene acceso total: puede hacer también lo que hace cada rol.
@ApiTags('Solicitudes de insumos')
@ApiBearerAuth()
@Controller('produccion/solicitudes-insumos')
export class ProduccionSolicitudesInsumosController {
  constructor(
    private readonly createSolicitudInsumos: CreateSolicitudInsumosUseCase,
    private readonly getSolicitudInsumosById: GetSolicitudInsumosByIdUseCase,
    private readonly listSolicitudesInsumos: ListSolicitudesInsumosUseCase,
    private readonly getIndicadoresSolicitudInsumos: GetIndicadoresSolicitudInsumosUseCase,
    private readonly actualizarFechaLimiteSolicitudInsumos: ActualizarFechaLimiteSolicitudInsumosUseCase,
    private readonly cambiarEstadoSolicitudInsumos: CambiarEstadoSolicitudInsumosUseCase,
    private readonly agregarDetalleLinea: AgregarDetalleLineaInsumoUseCase,
    private readonly actualizarDetalleLinea: ActualizarDetalleLineaInsumoUseCase,
    private readonly eliminarDetalleLinea: EliminarDetalleLineaInsumoUseCase,
  ) {}

  @Roles('admin', 'produccion')
  @Post()
  @ApiOperation({
    summary:
      'Crear una solicitud de insumos con su detalle (array de insumo_id + cantidad_solicitada), opcionalmente ligada a una solicitud de producción',
  })
  async create(
    @Body() dto: CreateSolicitudInsumosDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return SolicitudInsumosPresenter.toHttp(
      await this.createSolicitudInsumos.execute(dto, user.userId),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get()
  @ApiOperation({
    summary: 'Consultar solicitudes de insumos',
    description:
      'Permite filtrar por estado, código, insumo, solicitud de producción origen y rango de fechas; incluye historial y paginación.',
  })
  @ApiOkResponse({ description: 'Solicitudes paginadas' })
  async findAll(@Query() query: ListSolicitudInsumosQueryDto) {
    return SolicitudInsumosPresenter.paginatedToHttp(
      await this.listSolicitudesInsumos.execute(query),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get('indicadores')
  @ApiOperation({ summary: 'Conteo de solicitudes de insumos por estado' })
  @ApiOkResponse({
    description: 'KPIs: pendiente, en_proceso, entregado, rechazado, total',
  })
  async indicadores() {
    return this.getIndicadoresSolicitudInsumos.execute();
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una solicitud de insumos con su detalle' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return SolicitudInsumosPresenter.conDetalleToHttp(
      await this.getSolicitudInsumosById.execute(id),
    );
  }

  @Roles('admin', 'produccion')
  @Patch(':id')
  @ApiOperation({
    summary:
      'Actualizar la fecha límite (solo mientras la solicitud está pendiente)',
  })
  @ApiParam({ name: 'id', type: Number })
  async actualizarFechaLimite(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarFechaLimiteSolicitudInsumosDto,
  ) {
    return SolicitudInsumosPresenter.toHttp(
      await this.actualizarFechaLimiteSolicitudInsumos.execute(id, dto),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Patch(':id/estado')
  @ApiOperation({
    summary: 'Iniciar, entregar o rechazar una solicitud de insumos',
    description:
      'pendiente → en_proceso → entregado. rechazado solo se alcanza desde pendiente. ' +
      'producción solo puede rechazar; inventario (o admin) avanza. Al entregar se ' +
      'registra automáticamente la salida FEFO de cada insumo del detalle, usando ' +
      'cantidad_solicitada salvo que se envíe "items" con cantidad_entregada por línea ' +
      '(debe cubrir exactamente las líneas del detalle).',
  })
  @ApiConflictResponse({
    description:
      'Transición inválida, rol sin permiso, o stock insuficiente de algún insumo',
  })
  async updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoSolicitudInsumosDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return SolicitudInsumosPresenter.toHttp(
      await this.cambiarEstadoSolicitudInsumos.execute(
        id,
        dto.estado,
        user.roles,
        dto.items,
      ),
    );
  }

  @Roles('admin', 'produccion')
  @Post(':id/detalle')
  @ApiOperation({
    summary:
      'Agregar una línea al detalle (solo mientras la solicitud está pendiente)',
  })
  @ApiParam({ name: 'id', type: Number })
  async agregarDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearDetalleLineaInsumoDto,
  ) {
    return SolicitudInsumosDetallePresenter.toHttp(
      await this.agregarDetalleLinea.execute(id, dto),
    );
  }

  @Roles('admin', 'produccion')
  @Patch('detalle/:detalleId')
  @ApiOperation({
    summary:
      'Actualizar la cantidad de una línea (solo mientras la solicitud está pendiente)',
  })
  @ApiParam({ name: 'detalleId', type: Number })
  async actualizarDetalle(
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Body() dto: ActualizarDetalleLineaInsumoDto,
  ) {
    return SolicitudInsumosDetallePresenter.toHttp(
      await this.actualizarDetalleLinea.execute(detalleId, dto),
    );
  }

  @Roles('admin', 'produccion')
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
