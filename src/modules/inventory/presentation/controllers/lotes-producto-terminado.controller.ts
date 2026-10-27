import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { ListLoteProductoTerminadoQueryDto } from '../../application/dto/lote-producto-terminado-dtos/list-lote-producto-terminado-query.dto';
import { GetLoteProductoTerminadoByIdUseCase } from '../../application/use-cases/lote-producto-terminado/get-lote-producto-terminado-by-id.use-case';
import { ListLotesProductoTerminadoUseCase } from '../../application/use-cases/lote-producto-terminado/list-lotes-producto-terminado.use-case';
import { LoteProductoTerminadoPresenter } from '../presenters/lote-producto-terminado.presenter';

// Solo lectura (OFT0-259): los lotes de producto terminado nacen vía seed o
// (más adelante) desde producción, no desde este controller. Acá solo se
// consultan para poder aplicarles movimientos.
@ApiTags('Lotes de producto terminado')
@ApiBearerAuth()
@Roles('admin', 'inventario', 'produccion')
@Controller('lotes-producto-terminado')
export class LotesProductoTerminadoController {
  constructor(
    private readonly getLoteProductoTerminadoById: GetLoteProductoTerminadoByIdUseCase,
    private readonly listLotesProductoTerminado: ListLotesProductoTerminadoUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar lotes de producto terminado' })
  @ApiOkResponse({ description: 'Lista paginada de lotes' })
  async findAll(@Query() query: ListLoteProductoTerminadoQueryDto) {
    return LoteProductoTerminadoPresenter.paginatedToHttp(
      await this.listLotesProductoTerminado.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un lote de producto terminado por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return LoteProductoTerminadoPresenter.toHttp(
      await this.getLoteProductoTerminadoById.execute(id),
    );
  }
}
