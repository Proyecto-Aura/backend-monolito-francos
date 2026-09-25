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
import { CreateProductoPresentacionDto } from '../../application/dto/producto_presentacion-dtos/create-producto_presentacion.dto';
import { ListProductoPresentacionQueryDto } from '../../application/dto/producto_presentacion-dtos/list-producto_presentacion-query.dto';
import { UpdateProductoPresentacionDto } from '../../application/dto/producto_presentacion-dtos/update-producto_presentacion.dto';
import { ChangeProductoPresentacionStatusUseCase } from '../../application/use-cases/producto_presentacion/change-producto_presentacion-status.use-case';
import { CreateProductoPresentacionUseCase } from '../../application/use-cases/producto_presentacion/create-producto_presentacion.use-case';
import { GetProductoPresentacionUseCase } from '../../application/use-cases/producto_presentacion/get-producto_presentacion.use-case';
import { ListProductoPresentacionesUseCase } from '../../application/use-cases/producto_presentacion/list-producto_presentacion.use-case';
import { UpdateProductoPresentacionUseCase } from '../../application/use-cases/producto_presentacion/update-producto_presentacion.use-case';
import { ProductoPresentacionPresenter } from '../presenters/producto_presentacion.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

@ApiTags('Producto-presentaciones')
@ApiBearerAuth()
@Roles('admin', 'ventas')
@Controller('producto-presentaciones')
export class ProductoPresentacionesController {
  constructor(
    private readonly createProductoPresentacion: CreateProductoPresentacionUseCase,
    private readonly getProductoPresentacion: GetProductoPresentacionUseCase,
    private readonly listProductoPresentaciones: ListProductoPresentacionesUseCase,
    private readonly updateProductoPresentacion: UpdateProductoPresentacionUseCase,
    private readonly changeProductoPresentacionStatus: ChangeProductoPresentacionStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Agregar una presentación a un producto' })
  @ApiCreatedResponse({
    description: 'Producto presentación creada correctamente',
  })
  async create(@Body() dto: CreateProductoPresentacionDto) {
    return ProductoPresentacionPresenter.toHttp(
      await this.createProductoPresentacion.execute(dto),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar producto-presentaciones' })
  @ApiOkResponse({ description: 'Lista paginada de producto-presentaciones' })
  async findAll(@Query() query: ListProductoPresentacionQueryDto) {
    return ProductoPresentacionPresenter.paginatedToHttp(
      await this.listProductoPresentaciones.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una producto-presentación por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return ProductoPresentacionPresenter.toHttp(
      await this.getProductoPresentacion.execute(id),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una producto-presentación' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoPresentacionDto,
  ) {
    return ProductoPresentacionPresenter.toHttp(
      await this.updateProductoPresentacion.execute(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una producto-presentación' })
  @ApiParam({ name: 'id', type: Number })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return ProductoPresentacionPresenter.toHttp(
      await this.changeProductoPresentacionStatus.execute(id, false),
    );
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar una producto-presentación' })
  @ApiParam({ name: 'id', type: Number })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return ProductoPresentacionPresenter.toHttp(
      await this.changeProductoPresentacionStatus.execute(id, true),
    );
  }
}
