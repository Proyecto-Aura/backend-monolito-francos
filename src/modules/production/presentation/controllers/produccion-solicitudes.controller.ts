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

// Única ruta para solicitudes de producción (OFT0-261/262/264): la usan
// tanto inventario (crea, edita y puede rechazar mientras está pendiente)
// como producción (consulta y procesa). Los permisos van por operación, no
// a nivel de clase, porque difieren según quién hace qué.
@ApiTags('Solicitudes de producción')
@ApiBearerAuth()
@Controller('produccion/solicitudes')
export class ProduccionSolicitudesController {
  constructor(
    private readonly createSolicitudProduccion: CreateSolicitudProduccionUseCase,
    private readonly getSolicitudProduccionById: GetSolicitudProduccionByIdUseCase,
    private readonly listSolicitudesProduccion: ListSolicitudesProduccionUseCase,
    private readonly getIndicadoresSolicitudProduccion: GetIndicadoresSolicitudProduccionUseCase,
    private readonly actualizarFechaLimiteSolicitudProduccion: ActualizarFechaLimiteSolicitudProduccionUseCase,
    private readonly cambiarEstadoSolicitudProduccion: CambiarEstadoSolicitudProduccionUseCase,
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
  @ApiOperation({
    summary: 'Consultar solicitudes de producción',
    description:
      'Permite filtrar por estado, código, producto y rango de fechas; incluye historial y paginación.',
  })
  @ApiOkResponse({ description: 'Solicitudes paginadas' })
  async findAll(@Query() query: ListSolicitudProduccionQueryDto) {
    return SolicitudProduccionPresenter.paginatedToHttp(
      await this.listSolicitudesProduccion.execute(query),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get('indicadores')
  @ApiOperation({ summary: 'Conteo de solicitudes de producción por estado' })
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
    description:
      'Cada línea del detalle indica si ya tiene un lote registrado (lote_creado).',
  })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return SolicitudProduccionPresenter.conDetalleToHttp(
      await this.getSolicitudProduccionById.execute(id),
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

  @Roles('admin', 'inventario', 'produccion')
  @Patch(':id/estado')
  @ApiOperation({
    summary: 'Iniciar, completar o rechazar una solicitud de producción',
    description:
      'pendiente → en_proceso → entregado. rechazado solo se alcanza desde pendiente. ' +
      'inventario solo puede rechazar; producción (o admin) avanza. Para entregar debe ' +
      'existir un lote de cada producto vinculado a esta solicitud.',
  })
  @ApiConflictResponse({
    description:
      'Transición inválida, rol sin permiso, o faltan lotes de la solicitud',
  })
  async updateEstado(
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
