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
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { CreateLoteProductoTerminadoDto } from '../../application/dto/lote-producto-terminado-dtos/create-lote-producto-terminado.dto';
import { ListLoteProductoTerminadoQueryDto } from '../../application/dto/lote-producto-terminado-dtos/list-lote-producto-terminado-query.dto';
import { CreateLoteProductoTerminadoUseCase } from '../../application/use-cases/lote-producto-terminado/create-lote-producto-terminado.use-case';
import { GetLoteProductoTerminadoByIdUseCase } from '../../application/use-cases/lote-producto-terminado/get-lote-producto-terminado-by-id.use-case';
import { ListLotesProductoTerminadoUseCase } from '../../application/use-cases/lote-producto-terminado/list-lotes-producto-terminado.use-case';
import { LoteProductoTerminadoPresenter } from '../presenters/lote-producto-terminado.presenter';

// OFT0-263: producción registra sus propios lotes acá (antes solo nacían
// por seed). Lectura sigue abierta a admin/inventario/produccion; crear es
// cosa de producción (+ admin), igual que lotes-insumo es cosa de inventario.
@ApiTags('Lotes de producto terminado')
@ApiBearerAuth()
@Roles('admin', 'inventario', 'produccion')
@Controller('lotes-producto-terminado')
export class LotesProductoTerminadoController {
  constructor(
    private readonly createLoteProductoTerminado: CreateLoteProductoTerminadoUseCase,
    private readonly getLoteProductoTerminadoById: GetLoteProductoTerminadoByIdUseCase,
    private readonly listLotesProductoTerminado: ListLotesProductoTerminadoUseCase,
  ) {}

  @Roles('admin', 'produccion')
  @Post()
  @ApiOperation({ summary: 'Registrar un lote de producto terminado' })
  @ApiCreatedResponse({ description: 'Lote creado correctamente' })
  async create(@Body() dto: CreateLoteProductoTerminadoDto) {
    return LoteProductoTerminadoPresenter.toHttp(
      await this.createLoteProductoTerminado.execute(dto),
    );
  }

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
