import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { CreateLoteProductoTerminadoDto } from '../../application/dto/lote-producto-terminado-dtos/create-lote-producto-terminado.dto';
import { ListLoteProductoTerminadoQueryDto } from '../../application/dto/lote-producto-terminado-dtos/list-lote-producto-terminado-query.dto';
import { GetLoteProductoTerminadoByIdUseCase } from '../../application/use-cases/lote-producto-terminado/get-lote-producto-terminado-by-id.use-case';
import { ListLotesProductoTerminadoUseCase } from '../../application/use-cases/lote-producto-terminado/list-lotes-producto-terminado.use-case';
import { LoteProductoTerminadoPresenter } from '../presenters/lote-producto-terminado.presenter';
import { CreateLoteProductoTerminadoUseCase } from '../../application/use-cases/lote-producto-terminado/create-lote-producto-terminado.use-case';

// Única ruta para lotes de producto terminado. La consulta la comparten
// inventario y producción; el registro de un lote nuevo es solo de
// producción (o admin).
@ApiTags('Lotes de producto terminado')
@ApiBearerAuth()
@Controller('produccion/lotes-producto-terminado')
export class ProduccionLotesController {
  constructor(
    private readonly crear: CreateLoteProductoTerminadoUseCase,
    private readonly obtener: GetLoteProductoTerminadoByIdUseCase,
    private readonly listar: ListLotesProductoTerminadoUseCase,
  ) {}

  @Roles('admin', 'produccion')
  @Post()
  @ApiOperation({
    summary:
      'Registrar un lote producido, opcionalmente vinculado a una solicitud',
  })
  @ApiCreatedResponse({ description: 'Lote y entrada inicial registrados' })
  async create(@Body() dto: CreateLoteProductoTerminadoDto) {
    return LoteProductoTerminadoPresenter.toHttp(await this.crear.execute(dto));
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get()
  @ApiOperation({ summary: 'Consultar lotes de producto terminado' })
  async findAll(@Query() query: ListLoteProductoTerminadoQueryDto) {
    return LoteProductoTerminadoPresenter.paginatedToHttp(
      await this.listar.execute(query),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get(':id')
  @ApiOperation({ summary: 'Consultar un lote de producto terminado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return LoteProductoTerminadoPresenter.toHttp(
      await this.obtener.execute(id),
    );
  }
}
