import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ListCatalogoPublicoQueryDto } from '../../application/dto/catalogo-publico-dtos/list-catalogo-publico-query.dto';
import { GetProductoPublicoUseCase } from '../../application/use-cases/catalogo-publico/get-producto-publico.use-case';
import { ListCatalogoPublicoUseCase } from '../../application/use-cases/catalogo-publico/list-catalogo-publico.use-case';
import { Public } from '../../../auth/presentation/decorators/public.decorator';
import { CatalogoPublicoPresenter } from '../presenters/catalogo-publico.presenter';

// Catálogo del Portal B (HU-B-005). Es público, de solo lectura y con límite de
// peticiones por IP. Los guards globales JWT y Roles lo dejan pasar por
// @Public(); el ThrottlerGuard solo se aplica aquí.
@ApiTags('Catálogo público')
@Public()
@UseGuards(ThrottlerGuard)
@ApiTooManyRequestsResponse({
  description: 'Se superó el límite de peticiones por minuto',
})
@Controller('catalogo')
export class CatalogoPublicoController {
  constructor(
    private readonly listCatalogoPublico: ListCatalogoPublicoUseCase,
    private readonly getProductoPublico: GetProductoPublicoUseCase,
  ) {}

  @Get('productos')
  @ApiOperation({
    summary: 'Listar el catálogo público (una fila por presentación)',
  })
  @ApiOkResponse({ description: 'Lista paginada de presentaciones visibles' })
  @ApiBadRequestResponse({ description: 'Parámetros de consulta no válidos' })
  async findAll(@Query() query: ListCatalogoPublicoQueryDto) {
    return CatalogoPublicoPresenter.paginatedToHttp(
      await this.listCatalogoPublico.execute(query),
    );
  }

  @Get('productos/:id')
  @ApiOperation({
    summary: 'Detalle público de un producto con sus presentaciones visibles',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Id del producto' })
  @ApiOkResponse({ description: 'Producto con presentaciones y promociones' })
  @ApiBadRequestResponse({ description: 'El id no es un número entero' })
  @ApiNotFoundResponse({
    description: 'El producto no existe o no es visible en el Portal B',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return CatalogoPublicoPresenter.productoToHttp(
      await this.getProductoPublico.execute(id),
    );
  }
}
