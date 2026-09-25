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
import { CreateCategoriaDto } from '../../application/dto/categoria-dtos/create-categoria.dto';
import { ListCategoriasQueryDto } from '../../application/dto/categoria-dtos/list-categorias-query.dto';
import { UpdateCategoriaDto } from '../../application/dto/categoria-dtos/update-categoria.dto';
import { ChangeCategoriaStatusUseCase } from '../../application/use-cases/categoria/change-categoria-status.use-case';
import { CreateCategoriaUseCase } from '../../application/use-cases/categoria/create-categoria.use-case';
import { GetCategoriaByIdUseCase } from '../../application/use-cases/categoria/get-categoria-by-id.use-case';
import { ListCategoriasUseCase } from '../../application/use-cases/categoria/list-categorias.use-case';
import { UpdateCategoriaUseCase } from '../../application/use-cases/categoria/update-categoria.use-case';
import { CategoriaPresenter } from '../presenters/categoria.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

@ApiTags('Categorías')
@ApiBearerAuth()
@Roles('admin')
@Controller('categorias')
export class CategoriasController {
  constructor(
    private readonly createCategoria: CreateCategoriaUseCase,
    private readonly getCategoriaById: GetCategoriaByIdUseCase,
    private readonly listCategorias: ListCategoriasUseCase,
    private readonly updateCategoria: UpdateCategoriaUseCase,
    private readonly changeCategoriaStatus: ChangeCategoriaStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una categoría' })
  @ApiCreatedResponse({ description: 'Categoría creada correctamente' })
  async create(@Body() dto: CreateCategoriaDto) {
    return CategoriaPresenter.toHttp(await this.createCategoria.execute(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorías' })
  @ApiOkResponse({ description: 'Lista paginada de categorías' })
  async findAll(@Query() query: ListCategoriasQueryDto) {
    return CategoriaPresenter.paginatedToHttp(
      await this.listCategorias.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una categoría por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return CategoriaPresenter.toHttp(await this.getCategoriaById.execute(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una categoría' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoriaDto,
  ) {
    return CategoriaPresenter.toHttp(
      await this.updateCategoria.execute(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una categoría' })
  @ApiParam({ name: 'id', type: Number })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return CategoriaPresenter.toHttp(
      await this.changeCategoriaStatus.execute(id, false),
    );
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar una categoría' })
  @ApiParam({ name: 'id', type: Number })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return CategoriaPresenter.toHttp(
      await this.changeCategoriaStatus.execute(id, true),
    );
  }
}
