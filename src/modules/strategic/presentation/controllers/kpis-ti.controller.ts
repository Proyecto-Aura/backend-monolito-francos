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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { RegistrarKpiValorDto } from '../../application/dto/kpi-valor-dtos/registrar-kpi-valor.dto';
import { CreateKpiDto } from '../../application/dto/kpi-dtos/create-kpi.dto';
import { ListKpiQueryDto } from '../../application/dto/kpi-dtos/list-kpi-query.dto';
import { UpdateKpiDto } from '../../application/dto/kpi-dtos/update-kpi.dto';
import { CreateKpiTiUseCase } from '../../application/use-cases/kpi/create-kpi-ti.use-case';
import { EliminarKpiTiUseCase } from '../../application/use-cases/kpi/eliminar-kpi-ti.use-case';
import { ListarHistorialKpiValoresTiUseCase } from '../../application/use-cases/kpi/listar-historial-kpi-valores-ti.use-case';
import { ListKpisPorObjetivoTiUseCase } from '../../application/use-cases/kpi/list-kpis-por-objetivo-ti.use-case';
import { ObtenerUltimoKpiValorTiUseCase } from '../../application/use-cases/kpi/obtener-ultimo-kpi-valor-ti.use-case';
import { RegistrarKpiValorTiUseCase } from '../../application/use-cases/kpi/registrar-kpi-valor-ti.use-case';
import { UpdateKpiTiUseCase } from '../../application/use-cases/kpi/update-kpi-ti.use-case';
import { KpiValorPresenter } from '../presenters/kpi-valor.presenter';
import { KpiPresenter } from '../presenters/kpi.presenter';

@ApiTags('KPIs TI')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('kpis-ti')
export class KpisTiController {
  constructor(
    private readonly createKpiTi: CreateKpiTiUseCase,
    private readonly listKpisPorObjetivoTi: ListKpisPorObjetivoTiUseCase,
    private readonly registrarKpiValorTi: RegistrarKpiValorTiUseCase,
    private readonly listarHistorialKpiValoresTi: ListarHistorialKpiValoresTiUseCase,
    private readonly obtenerUltimoKpiValorTi: ObtenerUltimoKpiValorTiUseCase,
    private readonly updateKpiTi: UpdateKpiTiUseCase,
    private readonly eliminarKpiTi: EliminarKpiTiUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar KPIs de un objetivo estratégico de TI' })
  @ApiOkResponse({ description: 'Lista paginada de KPIs' })
  async findAll(@Query() query: ListKpiQueryDto) {
    return KpiPresenter.paginatedToHttp(
      await this.listKpisPorObjetivoTi.execute(query),
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar un KPI de TI con sus metas y semáforo por año',
  })
  @ApiCreatedResponse({ description: 'KPI creado correctamente' })
  async create(@Body() dto: CreateKpiDto) {
    return KpiPresenter.toHttp(await this.createKpiTi.execute(dto));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar un KPI de TI (solo con el plan en Borrador)',
  })
  @ApiOkResponse({ description: 'KPI actualizado correctamente' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKpiDto,
  ) {
    return KpiPresenter.toHttp(await this.updateKpiTi.execute(id, dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar lógicamente un KPI de TI' })
  @ApiOkResponse({ description: 'KPI eliminado correctamente' })
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    return KpiPresenter.toHttp(await this.eliminarKpiTi.execute(id));
  }

  @Post(':id/valores')
  @ApiOperation({
    summary: 'Registrar o corregir el valor de un KPI de TI en un periodo/año',
  })
  async registrarValor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarKpiValorDto,
  ) {
    return KpiValorPresenter.toHttp(
      await this.registrarKpiValorTi.execute(id, dto),
    );
  }

  @Get(':id/valores/ultimo')
  @ApiOperation({
    summary:
      'Último valor registrado del KPI de TI (para el listado principal)',
  })
  async ultimoValor(@Param('id', ParseIntPipe) id: number) {
    const valor = await this.obtenerUltimoKpiValorTi.execute(id);
    return valor ? KpiValorPresenter.toHttp(valor) : null;
  }

  @Get(':id/valores')
  @ApiOperation({
    summary: 'Historial completo de valores registrados del KPI de TI',
  })
  async historial(@Param('id', ParseIntPipe) id: number) {
    return KpiValorPresenter.listToHttp(
      await this.listarHistorialKpiValoresTi.execute(id),
    );
  }
}
