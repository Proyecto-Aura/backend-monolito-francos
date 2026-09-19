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
import { CreateRutaDto } from '../../application/dto/ruta-dtos/create-ruta.dto';
import { ListRutasQueryDto } from '../../application/dto/ruta-dtos/list-rutas-query.dto';
import { MoveRutaDto } from '../../application/dto/ruta-dtos/move-ruta.dto';
import { UpdateRutaDto } from '../../application/dto/ruta-dtos/update-ruta.dto';
import { ChangeRutaStatusUseCase } from '../../application/use-cases/rutas/change-ruta-status.use-case';
import { CreateRutaUseCase } from '../../application/use-cases/rutas/create-ruta.use-case';
import { GetRutaByIdUseCase } from '../../application/use-cases/rutas/get-ruta-by-id.use-case';
import { GetRutasTreeUseCase } from '../../application/use-cases/rutas/get-rutas-tree.use-case';
import { ListRutasUseCase } from '../../application/use-cases/rutas/list-rutas.use-case';
import { MoveRutaUseCase } from '../../application/use-cases/rutas/move-ruta.use-case';
import { UpdateRutaUseCase } from '../../application/use-cases/rutas/update-ruta.use-case';
import { RutaPresenter } from '../presenters/ruta.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

@ApiTags('Rutas')
@ApiBearerAuth()
@Roles('admin')
@Controller('rutas')
export class RutasController {
  constructor(
    private readonly createRuta: CreateRutaUseCase,
    private readonly getRutaById: GetRutaByIdUseCase,
    private readonly listRutas: ListRutasUseCase,
    private readonly getRutasTree: GetRutasTreeUseCase,
    private readonly updateRuta: UpdateRutaUseCase,
    private readonly moveRuta: MoveRutaUseCase,
    private readonly changeRutaStatus: ChangeRutaStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una ruta raíz o hija' })
  @ApiCreatedResponse({ description: 'Ruta creada correctamente' })
  async create(@Body() dto: CreateRutaDto) {
    return RutaPresenter.toHttp(await this.createRuta.execute(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Listar rutas' })
  @ApiOkResponse({ description: 'Lista paginada de rutas' })
  async findAll(@Query() query: ListRutasQueryDto) {
    return RutaPresenter.paginatedToHttp(await this.listRutas.execute(query));
  }

  @Get('tree')
  @ApiOperation({ summary: 'Obtener el árbol de rutas activas' })
  async tree() {
    return RutaPresenter.treeToHttp(await this.getRutasTree.execute());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una ruta por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return RutaPresenter.toHttp(await this.getRutaById.execute(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar el nombre de una ruta' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRutaDto,
  ) {
    return RutaPresenter.toHttp(await this.updateRuta.execute(id, dto));
  }

  @Patch(':id/parent')
  @ApiOperation({ summary: 'Mover una ruta dentro del árbol' })
  @ApiParam({ name: 'id', type: Number })
  async move(@Param('id', ParseIntPipe) id: number, @Body() dto: MoveRutaDto) {
    return RutaPresenter.toHttp(await this.moveRuta.execute(id, dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una ruta sin hijos activos' })
  @ApiParam({ name: 'id', type: Number })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return RutaPresenter.toHttp(await this.changeRutaStatus.execute(id, false));
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar una ruta' })
  @ApiParam({ name: 'id', type: Number })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return RutaPresenter.toHttp(await this.changeRutaStatus.execute(id, true));
  }
}
