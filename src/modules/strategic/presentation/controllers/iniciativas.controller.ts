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
import { CreateIniciativaDto } from '../../application/dto/iniciativa-dtos/create-iniciativa.dto';
import { ListIniciativaQueryDto } from '../../application/dto/iniciativa-dtos/list-iniciativa-query.dto';
import { UpdateEstadoIniciativaDto } from '../../application/dto/iniciativa-dtos/update-estado-iniciativa.dto';
import { UpdateIniciativaDto } from '../../application/dto/iniciativa-dtos/update-iniciativa.dto';
import { ActualizarEstadoIniciativaUseCase } from '../../application/use-cases/iniciativa/actualizar-estado-iniciativa.use-case';
import { CreateIniciativaUseCase } from '../../application/use-cases/iniciativa/create-iniciativa.use-case';
import { EliminarIniciativaUseCase } from '../../application/use-cases/iniciativa/eliminar-iniciativa.use-case';
import { ListIniciativasPorObjetivoUseCase } from '../../application/use-cases/iniciativa/list-iniciativas-por-objetivo.use-case';
import { UpdateIniciativaUseCase } from '../../application/use-cases/iniciativa/update-iniciativa.use-case';
import { IniciativaPresenter } from '../presenters/iniciativa.presenter';

@ApiTags('Iniciativas')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('iniciativas')
export class IniciativasController {
  constructor(
    private readonly createIniciativa: CreateIniciativaUseCase,
    private readonly listIniciativasPorObjetivo: ListIniciativasPorObjetivoUseCase,
    private readonly updateIniciativa: UpdateIniciativaUseCase,
    private readonly eliminarIniciativa: EliminarIniciativaUseCase,
    private readonly actualizarEstadoIniciativa: ActualizarEstadoIniciativaUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar iniciativas de un objetivo estratégico' })
  @ApiOkResponse({ description: 'Lista paginada de iniciativas' })
  async findAll(@Query() query: ListIniciativaQueryDto) {
    return IniciativaPresenter.paginatedToHttp(
      await this.listIniciativasPorObjetivo.execute(query),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una iniciativa' })
  @ApiCreatedResponse({ description: 'Iniciativa creada correctamente' })
  async create(@Body() dto: CreateIniciativaDto) {
    return IniciativaPresenter.toHttp(await this.createIniciativa.execute(dto));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar una iniciativa (solo con el plan en Borrador)',
  })
  @ApiOkResponse({ description: 'Iniciativa actualizada correctamente' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIniciativaDto,
  ) {
    return IniciativaPresenter.toHttp(
      await this.updateIniciativa.execute(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar lógicamente una iniciativa' })
  @ApiOkResponse({ description: 'Iniciativa eliminada correctamente' })
  @ApiParam({ name: 'id', type: Number })
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    return IniciativaPresenter.toHttp(
      await this.eliminarIniciativa.execute(id),
    );
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Actualizar el estado de una iniciativa' })
  @ApiOkResponse({ description: 'Estado de iniciativa actualizado' })
  @ApiParam({ name: 'id', type: Number })
  async actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoIniciativaDto,
  ) {
    return IniciativaPresenter.toHttp(
      await this.actualizarEstadoIniciativa.execute(id, dto),
    );
  }
}
