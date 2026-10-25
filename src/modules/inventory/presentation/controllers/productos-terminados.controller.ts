import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { UpdateProductoTerminadoDto } from '../../application/dto/producto-terminado-dtos/update-producto-terminado.dto';
import { GetIndicadoresProductoTerminadoUseCase } from '../../application/use-cases/producto-terminado/get-indicadores-producto-terminado.use-case';
import { UpdateProductoTerminadoUseCase } from '../../application/use-cases/producto-terminado/update-producto-terminado.use-case';
import { ProductoTerminadoPresenter } from '../presenters/producto-terminado.presenter';

// Stock de producto terminado (RF-A024). Crear y listar NO viven acá: el
// catálogo (módulo catalog) ya crea la fila de stock automáticamente al dar
// de alta una producto-presentación, y GET /producto-presentaciones ya
// devuelve ese stock embebido. Lo único que faltaba en todo el sistema era
// poder editar stock_minimo/stock_maximo, así que este controller solo cubre
// eso — identificado por el id de la producto-presentación (el mismo que ya
// devuelve el listado del catálogo), no por un id propio de esta tabla.
@ApiTags('Productos terminados')
@ApiBearerAuth()
@Roles('admin', 'inventario')
@Controller('productos-terminados')
export class ProductosTerminadosController {
  constructor(
    private readonly updateProductoTerminado: UpdateProductoTerminadoUseCase,
    private readonly getIndicadoresProductoTerminado: GetIndicadoresProductoTerminadoUseCase,
  ) {}

  @Roles('admin', 'inventario', 'produccion')
  @Get('indicadores')
  @ApiOperation({
    summary: 'Conteo de productos terminados activos por nivel de stock',
  })
  @ApiOkResponse({ description: 'KPIs: agotado, bajo, normal, alto, total' })
  async indicadores() {
    return this.getIndicadoresProductoTerminado.execute();
  }

  @Patch(':producto_presentacion_id')
  @ApiOperation({
    summary:
      'Actualizar stock_minimo/stock_maximo de una producto-presentación',
  })
  @ApiParam({ name: 'producto_presentacion_id', type: Number })
  @ApiOkResponse({ description: 'Producto terminado actualizado' })
  async update(
    @Param('producto_presentacion_id', ParseIntPipe)
    productoPresentacionId: number,
    @Body() dto: UpdateProductoTerminadoDto,
  ) {
    return ProductoTerminadoPresenter.toHttp(
      await this.updateProductoTerminado.execute(productoPresentacionId, dto),
    );
  }
}
