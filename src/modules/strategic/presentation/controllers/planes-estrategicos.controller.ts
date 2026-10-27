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
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePlanEstrategicoDto } from '../../application/dto/plan-estrategico-dtos/create-plan-estrategico.dto';
import { ListPlanEstrategicoQueryDto } from '../../application/dto/plan-estrategico-dtos/list-plan-estrategico-query.dto';
import { UpdatePlanEstrategicoDto } from '../../application/dto/plan-estrategico-dtos/update-plan-estrategico.dto';
import { ObtenerKpisPorPlanUseCase } from '../../application/use-cases/kpi/obtener-kpis-por-plan.use-case';
import { ObtenerKpisPorPlanTiUseCase } from '../../application/use-cases/kpi/obtener-kpis-por-plan-ti.use-case';
import { ObtenerIniciativasPorPlanUseCase } from '../../application/use-cases/iniciativa/obtener-iniciativas-por-plan.use-case';
import { ObtenerIniciativasPorPlanTiUseCase } from '../../application/use-cases/iniciativa/obtener-iniciativas-por-plan-ti.use-case';
import { ActivarPlanEstrategicoUseCase } from '../../application/use-cases/plan-estrategico/activar-plan-estrategico.use-case';
import { CerrarPlanEstrategicoUseCase } from '../../application/use-cases/plan-estrategico/cerrar-plan-estrategico.use-case';
import { CreatePlanEstrategicoUseCase } from '../../application/use-cases/plan-estrategico/create-plan-estrategico.use-case';
import { EliminarPlanEstrategicoUseCase } from '../../application/use-cases/plan-estrategico/eliminar-plan-estrategico.use-case';
import { GetPlanEstrategicoByIdUseCase } from '../../application/use-cases/plan-estrategico/get-plan-estrategico-by-id.use-case';
import { ListPlanesEstrategicosUseCase } from '../../application/use-cases/plan-estrategico/list-planes-estrategicos.use-case';
import { ListTodosPlanesEstrategicosUseCase } from '../../application/use-cases/plan-estrategico/list-todos-planes-estrategicos.use-case';
import { UpdatePlanEstrategicoUseCase } from '../../application/use-cases/plan-estrategico/update-plan-estrategico.use-case';
import { ObtenerObjetivosPorPlanUseCase } from '../../application/use-cases/objetivo-estrategico/obtener-objetivos-por-plan.use-case';
import { ObtenerObjetivosPorPlanTiUseCase } from '../../application/use-cases/objetivo-estrategico/obtener-objetivos-por-plan-ti.use-case';
import { ObtenerTableroControlUseCase } from '../../application/use-cases/tablero-control/obtener-tablero-control.use-case';
import { ObtenerTableroControlTiUseCase } from '../../application/use-cases/tablero-control/obtener-tablero-control-ti.use-case';
import { ObtenerSeguimientoKpisUseCase } from '../../application/use-cases/seguimiento-kpis/obtener-seguimiento-kpis.use-case';
import { KpiPresenter } from '../presenters/kpi.presenter';
import { IniciativaPresenter } from '../presenters/iniciativa.presenter';
import { ObjetivoEstrategicoPresenter } from '../presenters/objetivo-estrategico.presenter';
import { PlanEstrategicoPresenter } from '../presenters/plan-estrategico.presenter';
import { SeguimientoKpisPresenter } from '../presenters/seguimiento-kpis.presenter';
import { TableroControlPresenter } from '../presenters/tablero-control.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

@ApiTags('Planes Estratégicos')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('planes-estrategicos')
export class PlanesEstrategicosController {
  constructor(
    private readonly createPlanEstrategico: CreatePlanEstrategicoUseCase,
    private readonly listPlanesEstrategicos: ListPlanesEstrategicosUseCase,
    private readonly listTodosPlanesEstrategicos: ListTodosPlanesEstrategicosUseCase,
    private readonly getPlanEstrategicoById: GetPlanEstrategicoByIdUseCase,
    private readonly updatePlanEstrategico: UpdatePlanEstrategicoUseCase,
    private readonly eliminarPlanEstrategico: EliminarPlanEstrategicoUseCase,
    private readonly activarPlanEstrategico: ActivarPlanEstrategicoUseCase,
    private readonly cerrarPlanEstrategico: CerrarPlanEstrategicoUseCase,
    private readonly obtenerObjetivosPorPlan: ObtenerObjetivosPorPlanUseCase,
    private readonly obtenerObjetivosPorPlanTi: ObtenerObjetivosPorPlanTiUseCase,
    private readonly obtenerKpisPorPlan: ObtenerKpisPorPlanUseCase,
    private readonly obtenerKpisPorPlanTi: ObtenerKpisPorPlanTiUseCase,
    private readonly obtenerIniciativasPorPlan: ObtenerIniciativasPorPlanUseCase,
    private readonly obtenerIniciativasPorPlanTi: ObtenerIniciativasPorPlanTiUseCase,
    private readonly obtenerTableroControl: ObtenerTableroControlUseCase,
    private readonly obtenerTableroControlTi: ObtenerTableroControlTiUseCase,
    private readonly obtenerSeguimientoKpis: ObtenerSeguimientoKpisUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear un plan estratégico' })
  @ApiCreatedResponse({ description: 'Plan estratégico creado correctamente' })
  async create(@Body() dto: CreatePlanEstrategicoDto) {
    return PlanEstrategicoPresenter.toHttp(
      await this.createPlanEstrategico.execute(dto),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar planes estratégicos' })
  @ApiOkResponse({ description: 'Lista paginada de planes estratégicos' })
  async findAll(@Query() query: ListPlanEstrategicoQueryDto) {
    return PlanEstrategicoPresenter.paginatedToHttp(
      await this.listPlanesEstrategicos.execute(query),
    );
  }

  @Get('todos')
  @Roles('admin')
  @ApiOperation({
    summary:
      'Listar TODOS los planes estratégicos, incluidos los eliminados lógicamente',
  })
  @ApiOkResponse({
    description:
      'Lista paginada de planes estratégicos (sin filtrar por estado)',
  })
  async findAllTodos(@Query() query: ListPlanEstrategicoQueryDto) {
    return PlanEstrategicoPresenter.paginatedToHttp(
      await this.listTodosPlanesEstrategicos.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un plan estratégico por ID' })
  @ApiOkResponse({ description: 'Plan estratégico encontrado' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return PlanEstrategicoPresenter.toHttp(
      await this.getPlanEstrategicoById.execute(id),
    );
  }

  @Get(':id/objetivos-estrategicos')
  @ApiOperation({
    summary:
      'Resumen del plan con sus objetivos estratégicos agrupados por perspectiva',
  })
  @ApiOkResponse({ description: 'Plan y sus objetivos estratégicos (Negocio)' })
  @ApiParam({ name: 'id', type: Number })
  async objetivosDelPlan(@Param('id', ParseIntPipe) id: number) {
    const { plan, objetivos } = await this.obtenerObjetivosPorPlan.execute(id);
    return ObjetivoEstrategicoPresenter.resumenPorPlanToHttp(plan, objetivos);
  }

  @Get(':id/objetivos-estrategicos-ti')
  @ApiOperation({
    summary:
      'Resumen del plan con sus objetivos estratégicos de TI agrupados por perspectiva',
  })
  @ApiOkResponse({ description: 'Plan y sus objetivos estratégicos (TI)' })
  @ApiParam({ name: 'id', type: Number })
  async objetivosTiDelPlan(@Param('id', ParseIntPipe) id: number) {
    const { plan, objetivos } =
      await this.obtenerObjetivosPorPlanTi.execute(id);
    return ObjetivoEstrategicoPresenter.resumenPorPlanToHttpTi(plan, objetivos);
  }

  @Get(':id/kpis-ti')
  @ApiOperation({
    summary: 'Resumen de KPIs de TI del plan con su último valor registrado',
  })
  @ApiOkResponse({
    description: 'Lista de KPIs del plan (TI) con último valor',
  })
  @ApiParam({ name: 'id', type: Number })
  async kpisTiDelPlan(@Param('id', ParseIntPipe) id: number) {
    return KpiPresenter.resumenPorPlanToHttp(
      await this.obtenerKpisPorPlanTi.execute(id),
    );
  }

  @Get(':id/iniciativas-ti')
  @ApiOperation({ summary: 'Resumen de iniciativas de TI del plan' })
  @ApiOkResponse({ description: 'Lista de iniciativas del plan (TI)' })
  @ApiParam({ name: 'id', type: Number })
  async iniciativasTiDelPlan(@Param('id', ParseIntPipe) id: number) {
    return IniciativaPresenter.resumenPorPlanToHttp(
      await this.obtenerIniciativasPorPlanTi.execute(id),
    );
  }

  @Get(':id/kpis')
  @ApiOperation({
    summary: 'Resumen de KPIs del plan con su último valor registrado',
  })
  @ApiOkResponse({
    description: 'Lista de KPIs del plan (Negocio) con último valor',
  })
  @ApiParam({ name: 'id', type: Number })
  async kpisDelPlan(@Param('id', ParseIntPipe) id: number) {
    return KpiPresenter.resumenPorPlanToHttp(
      await this.obtenerKpisPorPlan.execute(id),
    );
  }

  @Get(':id/iniciativas')
  @ApiOperation({ summary: 'Resumen de iniciativas del plan' })
  @ApiOkResponse({ description: 'Lista de iniciativas del plan (Negocio)' })
  @ApiParam({ name: 'id', type: Number })
  async iniciativasDelPlan(@Param('id', ParseIntPipe) id: number) {
    return IniciativaPresenter.resumenPorPlanToHttp(
      await this.obtenerIniciativasPorPlan.execute(id),
    );
  }

  @Get(':id/tablero-control')
  @ApiOperation({ summary: 'Tablero de control (BSC) del plan' })
  @ApiOkResponse({
    description: 'Tablero de control agrupado por perspectiva',
  })
  @ApiParam({ name: 'id', type: Number })
  async tableroControlDelPlan(@Param('id', ParseIntPipe) id: number) {
    return TableroControlPresenter.toHttp(
      await this.obtenerTableroControl.execute(id),
    );
  }

  @Get(':id/tablero-control-ti')
  @ApiOperation({ summary: 'Tablero de control (BSC) de TI del plan' })
  @ApiOkResponse({
    description: 'Tablero de control de TI agrupado por perspectiva',
  })
  @ApiParam({ name: 'id', type: Number })
  async tableroControlTiDelPlan(@Param('id', ParseIntPipe) id: number) {
    return TableroControlPresenter.toHttpTi(
      await this.obtenerTableroControlTi.execute(id),
    );
  }

  @Get(':id/seguimiento-kpis')
  @ApiOperation({
    summary:
      'Seguimiento de KPIs del plan (tendencia y cumplimiento para gráficos)',
  })
  @ApiOkResponse({
    description:
      'KPIs agrupados por perspectiva/objetivo con su serie histórica completa y cumplimiento agregado',
  })
  @ApiParam({ name: 'id', type: Number })
  async seguimientoKpisDelPlan(@Param('id', ParseIntPipe) id: number) {
    return SeguimientoKpisPresenter.toHttp(
      await this.obtenerSeguimientoKpis.execute(id),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar los datos de un plan estratégico' })
  @ApiOkResponse({ description: 'Plan estratégico actualizado correctamente' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanEstrategicoDto,
  ) {
    return PlanEstrategicoPresenter.toHttp(
      await this.updatePlanEstrategico.execute(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar lógicamente un plan estratégico' })
  @ApiOkResponse({ description: 'Plan estratégico eliminado correctamente' })
  @ApiParam({ name: 'id', type: Number })
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    return PlanEstrategicoPresenter.toHttp(
      await this.eliminarPlanEstrategico.execute(id),
    );
  }

  @Patch(':id/activar')
  @ApiOperation({ summary: 'Activar un plan estratégico en borrador' })
  @ApiOkResponse({ description: 'Plan estratégico activado correctamente' })
  @ApiParam({ name: 'id', type: Number })
  async activar(@Param('id', ParseIntPipe) id: number) {
    return PlanEstrategicoPresenter.toHttp(
      await this.activarPlanEstrategico.execute(id),
    );
  }

  @Patch(':id/cerrar')
  @ApiOperation({ summary: 'Cerrar un plan estratégico activo' })
  @ApiOkResponse({ description: 'Plan estratégico cerrado correctamente' })
  @ApiParam({ name: 'id', type: Number })
  async cerrar(@Param('id', ParseIntPipe) id: number) {
    return PlanEstrategicoPresenter.toHttp(
      await this.cerrarPlanEstrategico.execute(id),
    );
  }
}
