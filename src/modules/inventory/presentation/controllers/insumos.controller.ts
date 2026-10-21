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
import { CreateInsumoDto } from '../../application/dto/insumo-dtos/create-insumo.dto';
import { ListInsumosQueryDto } from '../../application/dto/insumo-dtos/list-insumos-query.dto';
import { UpdateInsumoDto } from '../../application/dto/insumo-dtos/update-insumo.dto';
import { ChangeInsumoStatusUseCase } from '../../application/use-cases/insumo/change-insumo-status.use-case';
import { CreateInsumoUseCase } from '../../application/use-cases/insumo/create-insumo.use-case';
import { GetIndicadoresInsumoUseCase } from '../../application/use-cases/insumo/get-indicadores-insumo.use-case';
import { GetInsumoByIdUseCase } from '../../application/use-cases/insumo/get-insumo-by-id.use-case';
import { ListInsumosUseCase } from '../../application/use-cases/insumo/list-insumos.use-case';
import { UpdateInsumoUseCase } from '../../application/use-cases/insumo/update-insumo.use-case';
import { InsumoPresenter } from '../presenters/insumo.presenter';

@ApiTags('Insumos')
@ApiBearerAuth()
@Roles('admin', 'inventario')
@Controller('insumos')
export class InsumosController {
  constructor(
    private readonly createInsumo: CreateInsumoUseCase,
    private readonly getInsumoById: GetInsumoByIdUseCase,
    private readonly listInsumos: ListInsumosUseCase,
    private readonly updateInsumo: UpdateInsumoUseCase,
    private readonly changeInsumoStatus: ChangeInsumoStatusUseCase,
    private readonly getIndicadoresInsumo: GetIndicadoresInsumoUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear un insumo' })
  @ApiCreatedResponse({ description: 'Insumo creado correctamente' })
  async create(@Body() dto: CreateInsumoDto) {
    return InsumoPresenter.toHttp(await this.createInsumo.execute(dto));
  }

  // Lectura abierta a producción: necesita ver el stock disponible.
  @Roles('admin', 'inventario', 'produccion')
  @Get()
  @ApiOperation({ summary: 'Listar insumos' })
  @ApiOkResponse({ description: 'Lista paginada de insumos' })
  async findAll(@Query() query: ListInsumosQueryDto) {
    return InsumoPresenter.paginatedToHttp(
      await this.listInsumos.execute(query),
    );
  }

  // Debe ir antes de GET :id — si no, Nest intenta parsear "indicadores" como id numérico.
  @Roles('admin', 'inventario', 'produccion')
  @Get('indicadores')
  @ApiOperation({ summary: 'Conteo de insumos activos por nivel de stock' })
  @ApiOkResponse({ description: 'KPIs: agotado, bajo, normal, alto, total' })
  async indicadores() {
    return this.getIndicadoresInsumo.execute();
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un insumo por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return InsumoPresenter.toHttp(await this.getInsumoById.execute(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un insumo' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInsumoDto,
  ) {
    return InsumoPresenter.toHttp(await this.updateInsumo.execute(id, dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un insumo' })
  @ApiParam({ name: 'id', type: Number })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return InsumoPresenter.toHttp(
      await this.changeInsumoStatus.execute(id, false),
    );
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar un insumo' })
  @ApiParam({ name: 'id', type: Number })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return InsumoPresenter.toHttp(
      await this.changeInsumoStatus.execute(id, true),
    );
  }
}
