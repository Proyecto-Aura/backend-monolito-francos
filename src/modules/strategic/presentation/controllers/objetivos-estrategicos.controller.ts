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
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { CreateObjetivoEstrategicoDto } from '../../application/dto/objetivo-estrategico-dtos/create-objetivo-estrategico.dto';
import { ListObjetivoEstrategicoQueryDto } from '../../application/dto/objetivo-estrategico-dtos/list-objetivo-estrategico-query.dto';
import { UpdateObjetivoEstrategicoDto } from '../../application/dto/objetivo-estrategico-dtos/update-objetivo-estrategico.dto';
import { UpdateEstadoObjetivoDto } from '../../application/dto/objetivo-estrategico-dtos/update-estado-objetivo.dto';
import { ActualizarEstadoObjetivoUseCase } from '../../application/use-cases/objetivo-estrategico/actualizar-estado-objetivo.use-case';
import { CreateObjetivoEstrategicoUseCase } from '../../application/use-cases/objetivo-estrategico/create-objetivo-estrategico.use-case';
import { EliminarObjetivoEstrategicoUseCase } from '../../application/use-cases/objetivo-estrategico/eliminar-objetivo-estrategico.use-case';
import { EliminarRelacionOeUseCase } from '../../application/use-cases/objetivo-estrategico/eliminar-relacion-oe.use-case';
import { GetObjetivoEstrategicoByIdUseCase } from '../../application/use-cases/objetivo-estrategico/get-objetivo-estrategico-by-id.use-case';
import { ListObjetivosEstrategicosUseCase } from '../../application/use-cases/objetivo-estrategico/list-objetivos-estrategicos.use-case';
import { ListTodosObjetivosEstrategicosUseCase } from '../../application/use-cases/objetivo-estrategico/list-todos-objetivos-estrategicos.use-case';
import { UpdateObjetivoEstrategicoUseCase } from '../../application/use-cases/objetivo-estrategico/update-objetivo-estrategico.use-case';
import { ObjetivoEstrategicoPresenter } from '../presenters/objetivo-estrategico.presenter';

@ApiTags('Objetivos Estratégicos')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('objetivos-estrategicos')
export class ObjetivosEstrategicosController {
  constructor(
    private readonly createObjetivoEstrategico: CreateObjetivoEstrategicoUseCase,
    private readonly listObjetivosEstrategicos: ListObjetivosEstrategicosUseCase,
    private readonly listTodosObjetivosEstrategicos: ListTodosObjetivosEstrategicosUseCase,
    private readonly getObjetivoEstrategicoById: GetObjetivoEstrategicoByIdUseCase,
    private readonly updateObjetivoEstrategico: UpdateObjetivoEstrategicoUseCase,
    private readonly eliminarObjetivoEstrategico: EliminarObjetivoEstrategicoUseCase,
    private readonly eliminarRelacionOe: EliminarRelacionOeUseCase,
    private readonly actualizarEstadoObjetivo: ActualizarEstadoObjetivoUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear un objetivo estratégico' })
  @ApiCreatedResponse({
    description: 'Objetivo estratégico creado correctamente',
  })
  async create(@Body() dto: CreateObjetivoEstrategicoDto) {
    return ObjetivoEstrategicoPresenter.toHttp(
      await this.createObjetivoEstrategico.execute(dto),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar objetivos agrupados por perspectiva BSC' })
  @ApiOkResponse({
    description: 'Lista paginada de objetivos agrupados por perspectiva BSC',
  })
  async findAll(@Query() query: ListObjetivoEstrategicoQueryDto) {
    return ObjetivoEstrategicoPresenter.paginatedGroupedToHttp(
      await this.listObjetivosEstrategicos.execute(query),
    );
  }

  @Get('todos')
  @Roles('admin')
  @ApiOperation({
    summary:
      'Listar TODOS los objetivos estratégicos de un plan, incluidos los eliminados lógicamente',
  })
  @ApiOkResponse({
    description: 'Objetivos estratégicos (todos) agrupados por perspectiva BSC',
  })
  async findAllTodos(@Query() query: ListObjetivoEstrategicoQueryDto) {
    return ObjetivoEstrategicoPresenter.paginatedGroupedToHttp(
      await this.listTodosObjetivosEstrategicos.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un objetivo estratégico por ID' })
  @ApiOkResponse({ description: 'Objetivo estratégico encontrado' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return ObjetivoEstrategicoPresenter.toHttp(
      await this.getObjetivoEstrategicoById.execute(id),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un objetivo estratégico' })
  @ApiOkResponse({
    description: 'Objetivo estratégico actualizado correctamente',
  })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateObjetivoEstrategicoDto,
  ) {
    return ObjetivoEstrategicoPresenter.toHttp(
      await this.updateObjetivoEstrategico.execute(id, dto),
    );
  }

  @Patch(':id/estado')
  @ApiOperation({
    summary:
      'Actualizar el estado de avance del objetivo (solo con el plan Activo)',
  })
  @ApiOkResponse({ description: 'Estado actualizado correctamente' })
  async actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoObjetivoDto,
  ) {
    return ObjetivoEstrategicoPresenter.toHttp(
      await this.actualizarEstadoObjetivo.execute(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar lógicamente un objetivo estratégico' })
  @ApiOkResponse({
    description: 'Objetivo estratégico eliminado correctamente',
  })
  @ApiParam({ name: 'id', type: Number })
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    return ObjetivoEstrategicoPresenter.toHttp(
      await this.eliminarObjetivoEstrategico.execute(id),
    );
  }

  @Delete(':id/relaciones/:relacionId')
  @ApiOperation({ summary: 'Eliminar una relación causa-efecto del objetivo' })
  @ApiOkResponse({ description: 'Relación eliminada correctamente' })
  async eliminarRelacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('relacionId', ParseIntPipe) relacionId: number,
  ) {
    return ObjetivoEstrategicoPresenter.toHttp(
      await this.eliminarRelacionOe.execute(id, relacionId),
    );
  }
}
