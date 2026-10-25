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
import { ActualizarEstadoIniciativaTiUseCase } from '../../application/use-cases/iniciativa/actualizar-estado-iniciativa-ti.use-case';
import { CreateIniciativaTiUseCase } from '../../application/use-cases/iniciativa/create-iniciativa-ti.use-case';
import { EliminarIniciativaTiUseCase } from '../../application/use-cases/iniciativa/eliminar-iniciativa-ti.use-case';
import { ListIniciativasPorObjetivoTiUseCase } from '../../application/use-cases/iniciativa/list-iniciativas-por-objetivo-ti.use-case';
import { UpdateIniciativaTiUseCase } from '../../application/use-cases/iniciativa/update-iniciativa-ti.use-case';
import { IniciativaPresenter } from '../presenters/iniciativa.presenter';

@ApiTags('Iniciativas TI')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('iniciativas-ti')
export class IniciativasTiController {
  constructor(
    private readonly createIniciativaTi: CreateIniciativaTiUseCase,
    private readonly listIniciativasPorObjetivoTi: ListIniciativasPorObjetivoTiUseCase,
    private readonly updateIniciativaTi: UpdateIniciativaTiUseCase,
    private readonly eliminarIniciativaTi: EliminarIniciativaTiUseCase,
    private readonly actualizarEstadoIniciativaTi: ActualizarEstadoIniciativaTiUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar iniciativas de un objetivo estratégico de TI',
  })
  @ApiOkResponse({ description: 'Lista paginada de iniciativas de TI' })
  async findAll(@Query() query: ListIniciativaQueryDto) {
    return IniciativaPresenter.paginatedToHttp(
      await this.listIniciativasPorObjetivoTi.execute(query),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una iniciativa de TI' })
  @ApiCreatedResponse({ description: 'Iniciativa de TI creada correctamente' })
  async create(@Body() dto: CreateIniciativaDto) {
    return IniciativaPresenter.toHttp(
      await this.createIniciativaTi.execute(dto),
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar una iniciativa de TI (solo con el plan en Borrador)',
  })
  @ApiOkResponse({ description: 'Iniciativa de TI actualizada correctamente' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIniciativaDto,
  ) {
    return IniciativaPresenter.toHttp(
      await this.updateIniciativaTi.execute(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar lógicamente una iniciativa de TI' })
  @ApiOkResponse({ description: 'Iniciativa de TI eliminada correctamente' })
  @ApiParam({ name: 'id', type: Number })
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    return IniciativaPresenter.toHttp(
      await this.eliminarIniciativaTi.execute(id),
    );
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Actualizar el estado de una iniciativa de TI' })
  @ApiOkResponse({ description: 'Estado de iniciativa de TI actualizado' })
  @ApiParam({ name: 'id', type: Number })
  async actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoIniciativaDto,
  ) {
    return IniciativaPresenter.toHttp(
      await this.actualizarEstadoIniciativaTi.execute(id, dto),
    );
  }
}
