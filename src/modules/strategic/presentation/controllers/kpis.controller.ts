import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { CreateKpiDto } from '../../application/dto/kpi-dtos/create-kpi.dto';
import { ListKpiQueryDto } from '../../application/dto/kpi-dtos/list-kpi-query.dto';
import { CreateKpiUseCase } from '../../application/use-cases/kpi/create-kpi.use-case';
import { ListKpisPorObjetivoUseCase } from '../../application/use-cases/kpi/list-kpis-por-objetivo.use-case';
import { KpiPresenter } from '../presenters/kpi.presenter';

@ApiTags('KPIs')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('kpis')
export class KpisController {
  constructor(
    private readonly createKpi: CreateKpiUseCase,
    private readonly listKpisPorObjetivo: ListKpisPorObjetivoUseCase,
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
}
