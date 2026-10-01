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
import { ActivarPlanEstrategicoUseCase } from '../../application/use-cases/plan-estrategico/activar-plan-estrategico.use-case';
import { CerrarPlanEstrategicoUseCase } from '../../application/use-cases/plan-estrategico/cerrar-plan-estrategico.use-case';
import { CreatePlanEstrategicoUseCase } from '../../application/use-cases/plan-estrategico/create-plan-estrategico.use-case';
import { EliminarPlanEstrategicoUseCase } from '../../application/use-cases/plan-estrategico/eliminar-plan-estrategico.use-case';
import { GetPlanEstrategicoByIdUseCase } from '../../application/use-cases/plan-estrategico/get-plan-estrategico-by-id.use-case';
import { ListPlanesEstrategicosUseCase } from '../../application/use-cases/plan-estrategico/list-planes-estrategicos.use-case';
import { UpdatePlanEstrategicoUseCase } from '../../application/use-cases/plan-estrategico/update-plan-estrategico.use-case';
import { PlanEstrategicoPresenter } from '../presenters/plan-estrategico.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

@ApiTags('Planes Estratégicos')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('planes-estrategicos')
export class PlanesEstrategicosController {
  constructor(
    private readonly createPlanEstrategico: CreatePlanEstrategicoUseCase,
    private readonly listPlanesEstrategicos: ListPlanesEstrategicosUseCase,
    private readonly getPlanEstrategicoById: GetPlanEstrategicoByIdUseCase,
    private readonly updatePlanEstrategico: UpdatePlanEstrategicoUseCase,
    private readonly eliminarPlanEstrategico: EliminarPlanEstrategicoUseCase,
    private readonly activarPlanEstrategico: ActivarPlanEstrategicoUseCase,
    private readonly cerrarPlanEstrategico: CerrarPlanEstrategicoUseCase,
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

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un plan estratégico por ID' })
  @ApiOkResponse({ description: 'Plan estratégico encontrado' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return PlanEstrategicoPresenter.toHttp(
      await this.getPlanEstrategicoById.execute(id),
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
