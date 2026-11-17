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
import { CreateObjetivoEstrategicoTiDto } from '../../application/dto/objetivo-estrategico-dtos/create-objetivo-estrategico-ti.dto';
import { ListObjetivoEstrategicoQueryDto } from '../../application/dto/objetivo-estrategico-dtos/list-objetivo-estrategico-query.dto';
import { UpdateEstadoObjetivoDto } from '../../application/dto/objetivo-estrategico-dtos/update-estado-objetivo.dto';
import { UpdateObjetivoEstrategicoTiDto } from '../../application/dto/objetivo-estrategico-dtos/update-objetivo-estrategico-ti.dto';
import { ActualizarEstadoObjetivoTiUseCase } from '../../application/use-cases/objetivo-estrategico/actualizar-estado-objetivo-ti.use-case';
import { CreateObjetivoEstrategicoTiUseCase } from '../../application/use-cases/objetivo-estrategico/create-objetivo-estrategico-ti.use-case';
import { EliminarObjetivoEstrategicoTiUseCase } from '../../application/use-cases/objetivo-estrategico/eliminar-objetivo-estrategico-ti.use-case';
import { EliminarRelacionOeUseCase } from '../../application/use-cases/objetivo-estrategico/eliminar-relacion-oe.use-case';
import { GetObjetivoEstrategicoTiByIdUseCase } from '../../application/use-cases/objetivo-estrategico/get-objetivo-estrategico-ti-by-id.use-case';
import { ListObjetivosEstrategicosTiUseCase } from '../../application/use-cases/objetivo-estrategico/list-objetivos-estrategicos-ti.use-case';
import { ListTodosObjetivosEstrategicosTiUseCase } from '../../application/use-cases/objetivo-estrategico/list-todos-objetivos-estrategicos-ti.use-case';
import { UpdateObjetivoEstrategicoTiUseCase } from '../../application/use-cases/objetivo-estrategico/update-objetivo-estrategico-ti.use-case';
import { ObjetivoEstrategicoPresenter } from '../presenters/objetivo-estrategico.presenter';

@ApiTags('Objetivos Estratégicos TI')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('objetivos-estrategicos-ti')
export class ObjetivosEstrategicosTiController {
  constructor(
    private readonly createObjetivoEstrategicoTi: CreateObjetivoEstrategicoTiUseCase,
    private readonly listObjetivosEstrategicosTi: ListObjetivosEstrategicosTiUseCase,
    private readonly listTodosObjetivosEstrategicosTi: ListTodosObjetivosEstrategicosTiUseCase,
    private readonly getObjetivoEstrategicoTiById: GetObjetivoEstrategicoTiByIdUseCase,
    private readonly updateObjetivoEstrategicoTi: UpdateObjetivoEstrategicoTiUseCase,
    private readonly eliminarObjetivoEstrategicoTi: EliminarObjetivoEstrategicoTiUseCase,
    private readonly eliminarRelacionOe: EliminarRelacionOeUseCase,
    private readonly actualizarEstadoObjetivoTi: ActualizarEstadoObjetivoTiUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear un objetivo estratégico de TI' })
  @ApiCreatedResponse({
    description: 'Objetivo estratégico de TI creado correctamente',
  })
  async create(@Body() dto: CreateObjetivoEstrategicoTiDto) {
    return ObjetivoEstrategicoPresenter.toHttpTi(
      await this.createObjetivoEstrategicoTi.execute(dto),
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar objetivos de TI agrupados por perspectiva BSC',
  })
  @ApiOkResponse({
    description:
      'Lista paginada de objetivos de TI agrupados por perspectiva BSC',
  })
  async findAll(@Query() query: ListObjetivoEstrategicoQueryDto) {
    return ObjetivoEstrategicoPresenter.paginatedGroupedToHttpTi(
      await this.listObjetivosEstrategicosTi.execute(query),
    );
  }

  @Get('todos')
  @Roles('admin')
  @ApiOperation({
    summary:
      'Listar TODOS los objetivos estratégicos de TI de un plan, incluidos los eliminados lógicamente',
  })
  @ApiOkResponse({
    description:
      'Objetivos estratégicos de TI (todos) agrupados por perspectiva BSC',
  })
  async findAllTodos(@Query() query: ListObjetivoEstrategicoQueryDto) {
    return ObjetivoEstrategicoPresenter.paginatedGroupedToHttpTi(
      await this.listTodosObjetivosEstrategicosTi.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un objetivo estratégico de TI por ID' })
  @ApiOkResponse({ description: 'Objetivo estratégico de TI encontrado' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return ObjetivoEstrategicoPresenter.toHttpTi(
      await this.getObjetivoEstrategicoTiById.execute(id),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un objetivo estratégico de TI' })
  @ApiOkResponse({
    description: 'Objetivo estratégico de TI actualizado correctamente',
  })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateObjetivoEstrategicoTiDto,
  ) {
    return ObjetivoEstrategicoPresenter.toHttpTi(
      await this.updateObjetivoEstrategicoTi.execute(id, dto),
    );
  }

  @Patch(':id/estado')
  @ApiOperation({
    summary:
      'Actualizar el estado de avance del objetivo de TI (solo con el plan Activo)',
  })
  @ApiOkResponse({ description: 'Estado actualizado correctamente' })
  @ApiParam({ name: 'id', type: Number })
  async actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoObjetivoDto,
  ) {
    return ObjetivoEstrategicoPresenter.toHttpTi(
      await this.actualizarEstadoObjetivoTi.execute(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar lógicamente un objetivo estratégico de TI',
  })
  @ApiOkResponse({
    description: 'Objetivo estratégico de TI eliminado correctamente',
  })
  @ApiParam({ name: 'id', type: Number })
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    return ObjetivoEstrategicoPresenter.toHttpTi(
      await this.eliminarObjetivoEstrategicoTi.execute(id),
    );
  }

  @Delete(':id/relaciones/:relacionId')
  @ApiOperation({
    summary: 'Eliminar una relación causa-efecto del objetivo de TI',
  })
  @ApiOkResponse({ description: 'Relación eliminada correctamente' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'relacionId', type: Number })
  async eliminarRelacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('relacionId', ParseIntPipe) relacionId: number,
  ) {
    return ObjetivoEstrategicoPresenter.toHttpTi(
      await this.eliminarRelacionOe.execute(id, relacionId),
    );
  }
}
