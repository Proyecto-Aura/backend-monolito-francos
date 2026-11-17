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
import { CreatePresentacionDto } from '../../application/dto/presentacion-dtos/create-presentacion.dto';
import { ListPresentacionQueryDto } from '../../application/dto/presentacion-dtos/list-presentacion-query.dto';
import { UpdatePresentacionDto } from '../../application/dto/presentacion-dtos/update-presentacion.dto';
import { ChangePresentacionStatusUseCase } from '../../application/use-cases/presentacion/change-presentacion-status.use-case';
import { CreatePresentacionUseCase } from '../../application/use-cases/presentacion/create-presentacion.use-case';
import { GetPresentacionUseCase } from '../../application/use-cases/presentacion/get-presentacion.use-case';
import { ListPresentacionUseCase } from '../../application/use-cases/presentacion/list-presentacion.use-case';
import { UpdatePresentacionUseCase } from '../../application/use-cases/presentacion/update-presentacion.use-case';
import { PresentacionPresenter } from '../presenters/presentacion.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

@ApiTags('Presentaciones')
@ApiBearerAuth()
@Roles('admin')
@Controller('presentaciones')
export class PresentacionesController {
  constructor(
    private readonly createPresentacion: CreatePresentacionUseCase,
    private readonly getPresentacion: GetPresentacionUseCase,
    private readonly listPresentaciones: ListPresentacionUseCase,
    private readonly updatePresentacion: UpdatePresentacionUseCase,
    private readonly changePresentacionStatus: ChangePresentacionStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una presentación' })
  @ApiCreatedResponse({ description: 'Presentación creada correctamente' })
  async create(@Body() dto: CreatePresentacionDto) {
    return PresentacionPresenter.toHttp(
      await this.createPresentacion.execute(dto),
    );
  }

  // Lectura abierta a ventas (formulario de productos) e inventario (pantalla
  // de stock de producto terminado, OFT0-258). Crear, editar y desactivar
  // siguen siendo solo admin (@Roles de la clase).
  @Roles('admin', 'ventas', 'inventario')
  @Get()
  @ApiOperation({ summary: 'Listar presentaciones' })
  @ApiOkResponse({ description: 'Lista paginada de presentaciones' })
  async findAll(@Query() query: ListPresentacionQueryDto) {
    return PresentacionPresenter.paginatedToHttp(
      await this.listPresentaciones.execute(query),
    );
  }

  @Roles('admin', 'ventas', 'inventario')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una presentación por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return PresentacionPresenter.toHttp(await this.getPresentacion.execute(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una presentación' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePresentacionDto,
  ) {
    return PresentacionPresenter.toHttp(
      await this.updatePresentacion.execute(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una presentación' })
  @ApiParam({ name: 'id', type: Number })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return PresentacionPresenter.toHttp(
      await this.changePresentacionStatus.execute(id, false),
    );
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar una presentación' })
  @ApiParam({ name: 'id', type: Number })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return PresentacionPresenter.toHttp(
      await this.changePresentacionStatus.execute(id, true),
    );
  }
}
