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
import { CreateKpiUseCase } from '../../application/use-cases/kpi/create-kpi.use-case';
import { ListarHistorialKpiValoresUseCase } from '../../application/use-cases/kpi/listar-historial-kpi-valores.use-case';
import { ListKpisPorObjetivoUseCase } from '../../application/use-cases/kpi/list-kpis-por-objetivo.use-case';
import { ObtenerUltimoKpiValorUseCase } from '../../application/use-cases/kpi/obtener-ultimo-kpi-valor.use-case';
import { RegistrarKpiValorUseCase } from '../../application/use-cases/kpi/registrar-kpi-valor.use-case';
import { KpiValorPresenter } from '../presenters/kpi-valor.presenter';
import { KpiPresenter } from '../presenters/kpi.presenter';

@ApiTags('KPIs')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('kpis')
export class KpisController {
  constructor(
    private readonly createKpi: CreateKpiUseCase,
    private readonly listKpisPorObjetivo: ListKpisPorObjetivoUseCase,
    private readonly registrarKpiValor: RegistrarKpiValorUseCase,
    private readonly listarHistorialKpiValores: ListarHistorialKpiValoresUseCase,
    private readonly obtenerUltimoKpiValor: ObtenerUltimoKpiValorUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar KPIs de un objetivo estratégico' })
  @ApiOkResponse({ description: 'Lista paginada de KPIs' })
  async findAll(@Query() query: ListKpiQueryDto) {
    return KpiPresenter.paginatedToHttp(
      await this.listKpisPorObjetivo.execute(query),
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar un KPI con sus metas y semáforo por año',
  })
  @ApiCreatedResponse({ description: 'KPI creado correctamente' })
  async create(@Body() dto: CreateKpiDto) {
    return KpiPresenter.toHttp(await this.createKpi.execute(dto));
  }

  @Post(':id/valores')
  @ApiOperation({
    summary: 'Registrar o corregir el valor de un KPI en un periodo/año',
  })
  async registrarValor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarKpiValorDto,
  ) {
    return KpiValorPresenter.toHttp(
      await this.registrarKpiValor.execute(id, dto),
    );
  }

  @Get(':id/valores/ultimo')
  @ApiOperation({
    summary: 'Último valor registrado del KPI (para el listado principal)',
  })
  async ultimoValor(@Param('id', ParseIntPipe) id: number) {
    const valor = await this.obtenerUltimoKpiValor.execute(id);
    return valor ? KpiValorPresenter.toHttp(valor) : null;
  }

  @Get(':id/valores')
  @ApiOperation({
    summary: 'Historial completo de valores registrados del KPI',
  })
  async historial(@Param('id', ParseIntPipe) id: number) {
    return KpiValorPresenter.listToHttp(
      await this.listarHistorialKpiValores.execute(id),
    );
  }
}
