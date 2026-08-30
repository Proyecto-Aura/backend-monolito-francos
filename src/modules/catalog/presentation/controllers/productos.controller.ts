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
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProductoWithPresentacionesDto } from '../../application/dto/producto-dtos/create-producto-with-presentaciones.dto';
import { ListProductoQueryDto } from '../../application/dto/producto-dtos/list-producto-query.dto';
import { UpdateProductoWithPresentacionesDto } from '../../application/dto/producto-dtos/update-producto-with-presentaciones.dto';
import { ChangeProductoStatusUseCase } from '../../application/use-cases/producto/change-producto-status.use-case';
import { CreateProductoUseCase } from '../../application/use-cases/producto/create-producto.use-case';
import { GetProductoByIdUseCase } from '../../application/use-cases/producto/get-producto-by-id.use-case';
import { ListProductosUseCase } from '../../application/use-cases/producto/list-producto.use-case';
import { UpdateProductoUseCase } from '../../application/use-cases/producto/update-producto.use-case';
import { ProductoPresenter } from '../presenters/producto.presenter';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/presentation/guards/roles.guard';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

@ApiTags('Productos')
@Controller('productos')
export class ProductosController {
  constructor(
    private readonly createProducto: CreateProductoUseCase,
    private readonly getProductoById: GetProductoByIdUseCase,
    private readonly listProductos: ListProductosUseCase,
    private readonly updateProducto: UpdateProductoUseCase,
    private readonly changeProductoStatus: ChangeProductoStatusUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'ventas')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear un producto con sus presentaciones iniciales',
  })
  @ApiCreatedResponse({ description: 'Producto creado correctamente' })
  async create(@Body() dto: CreateProductoWithPresentacionesDto) {
    return ProductoPresenter.withPresentacionesToHttp(
      await this.createProducto.execute(dto),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar productos' })
  @ApiOkResponse({ description: 'Lista paginada de productos' })
  async findAll(@Query() query: ListProductoQueryDto) {
    return ProductoPresenter.paginatedToHttp(
      await this.listProductos.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return ProductoPresenter.withPresentacionesToHttp(
      await this.getProductoById.execute(id),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'ventas')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar un producto, sus presentaciones y promociones',
  })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoWithPresentacionesDto,
  ) {
    return ProductoPresenter.withPresentacionesToHttp(
      await this.updateProducto.execute(id, dto),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'ventas')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desactivar un producto' })
  @ApiParam({ name: 'id', type: Number })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return ProductoPresenter.toHttp(
      await this.changeProductoStatus.execute(id, false),
    );
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'ventas')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivar un producto' })
  @ApiParam({ name: 'id', type: Number })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return ProductoPresenter.toHttp(
      await this.changeProductoStatus.execute(id, true),
    );
  }
}
