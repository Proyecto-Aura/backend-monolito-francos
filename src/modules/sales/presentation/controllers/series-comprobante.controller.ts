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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSerieComprobanteDto } from '../../application/dto/serie-comprobante-dtos/create-serie-comprobante.dto';
import { ListSeriesComprobanteQueryDto } from '../../application/dto/serie-comprobante-dtos/list-series-comprobante-query.dto';
import { UpdateSerieComprobanteDto } from '../../application/dto/serie-comprobante-dtos/update-serie-comprobante.dto';
import { ChangeSerieComprobanteStatusUseCase } from '../../application/use-cases/series-comprobante/change-serie-comprobante-status.use-case';
import { CreateSerieComprobanteUseCase } from '../../application/use-cases/series-comprobante/create-serie-comprobante.use-case';
import { GetSerieComprobanteByIdUseCase } from '../../application/use-cases/series-comprobante/get-serie-comprobante-by-id.use-case';
import { ListAlertasSeriesComprobanteUseCase } from '../../application/use-cases/series-comprobante/list-alertas-series-comprobante.use-case';
import { ListSeriesComprobanteUseCase } from '../../application/use-cases/series-comprobante/list-series-comprobante.use-case';
import { UpdateSerieComprobanteUseCase } from '../../application/use-cases/series-comprobante/update-serie-comprobante.use-case';
import { SerieComprobantePresenter } from '../presenters/serie-comprobante.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

@ApiTags('Series de comprobante')
@ApiBearerAuth()
@Roles('admin')
@Controller('series-comprobante')
export class SeriesComprobanteController {
  constructor(
    private readonly createSerie: CreateSerieComprobanteUseCase,
    private readonly listSeries: ListSeriesComprobanteUseCase,
    private readonly listAlertas: ListAlertasSeriesComprobanteUseCase,
    private readonly getSerie: GetSerieComprobanteByIdUseCase,
    private readonly updateSerie: UpdateSerieComprobanteUseCase,
    private readonly changeStatus: ChangeSerieComprobanteStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una serie de comprobantes' })
  @ApiCreatedResponse({ description: 'Serie creada' })
  @ApiBadRequestResponse({
    description: 'Formato SUNAT, prefijo según el tipo o rango inválidos',
  })
  @ApiConflictResponse({
    description: 'Código duplicado o ya hay una serie activa de ese tipo',
  })
  async create(@Body() dto: CreateSerieComprobanteDto) {
    return SerieComprobantePresenter.toHttp(
      await this.createSerie.execute(dto),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar series de comprobantes' })
  @ApiOkResponse({ description: 'Lista paginada de series' })
  async findAll(@Query() query: ListSeriesComprobanteQueryDto) {
    return SerieComprobantePresenter.paginatedToHttp(
      await this.listSeries.execute(query),
    );
  }

  // Antes de `:id` para que "alertas" no se interprete como un id.
  @Get('alertas')
  @ApiOperation({
    summary: 'Series activas próximas a agotar su rango (RF-A192)',
  })
  @ApiOkResponse({ description: 'Series con por_agotar = true' })
  async findAlertas() {
    return SerieComprobantePresenter.listToHttp(
      await this.listAlertas.execute(),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una serie por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNotFoundResponse({ description: 'La serie no existe' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return SerieComprobantePresenter.toHttp(await this.getSerie.execute(id));
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Actualizar una serie (si ya emitió, solo ampliar correlativo_fin y cambiar umbral_alerta)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiNotFoundResponse({ description: 'La serie no existe' })
  @ApiBadRequestResponse({ description: 'Prefijo según el tipo o rango' })
  @ApiConflictResponse({
    description:
      'Cambio no permitido tras emitir, código duplicado o segunda activa del tipo',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSerieComprobanteDto,
  ) {
    return SerieComprobantePresenter.toHttp(
      await this.updateSerie.execute(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Desactivar una serie (conserva su correlativo)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiNotFoundResponse({ description: 'La serie no existe' })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return SerieComprobantePresenter.toHttp(
      await this.changeStatus.execute(id, false),
    );
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar una serie (continúa su correlativo)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNotFoundResponse({ description: 'La serie no existe' })
  @ApiConflictResponse({ description: 'Ya hay una serie activa de ese tipo' })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return SerieComprobantePresenter.toHttp(
      await this.changeStatus.execute(id, true),
    );
  }
}
