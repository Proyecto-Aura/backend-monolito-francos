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
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { CreateLoteInsumoDto } from '../../application/dto/lote-insumo-dtos/create-lote-insumo.dto';
import { ListLoteInsumosQueryDto } from '../../application/dto/lote-insumo-dtos/list-lote-insumos-query.dto';
import { ChangeLoteInsumoStatusUseCase } from '../../application/use-cases/lote-insumo/change-lote-insumo-status.use-case';
import { CreateLoteInsumoUseCase } from '../../application/use-cases/lote-insumo/create-lote-insumo.use-case';
import { GetLoteInsumoByIdUseCase } from '../../application/use-cases/lote-insumo/get-lote-insumo-by-id.use-case';
import { ListLoteInsumosUseCase } from '../../application/use-cases/lote-insumo/list-lote-insumos.use-case';
import { LoteInsumoPresenter } from '../presenters/lote-insumo.presenter';

// Sin edición a propósito: un lote no se modifica una vez creado, solo se da
// de baja lógicamente (DELETE) o se reactiva (PATCH :id/activate).
@ApiTags('Lotes de insumo')
@ApiBearerAuth()
@Roles('admin', 'inventario')
@Controller('lotes-insumo')
export class LotesInsumoController {
  constructor(
    private readonly createLoteInsumo: CreateLoteInsumoUseCase,
    private readonly getLoteInsumoById: GetLoteInsumoByIdUseCase,
    private readonly listLoteInsumos: ListLoteInsumosUseCase,
    private readonly changeLoteInsumoStatus: ChangeLoteInsumoStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un lote de insumo' })
  @ApiCreatedResponse({ description: 'Lote creado correctamente' })
  async create(@Body() dto: CreateLoteInsumoDto) {
    return LoteInsumoPresenter.toHttp(await this.createLoteInsumo.execute(dto));
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get()
  @ApiOperation({ summary: 'Listar lotes de insumo' })
  @ApiOkResponse({ description: 'Lista paginada de lotes' })
  async findAll(@Query() query: ListLoteInsumosQueryDto) {
    return LoteInsumoPresenter.paginatedToHttp(
      await this.listLoteInsumos.execute(query),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un lote de insumo por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return LoteInsumoPresenter.toHttp(await this.getLoteInsumoById.execute(id));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Dar de baja lógica un lote de insumo' })
  @ApiParam({ name: 'id', type: Number })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return LoteInsumoPresenter.toHttp(
      await this.changeLoteInsumoStatus.execute(id, false),
    );
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar un lote de insumo' })
  @ApiParam({ name: 'id', type: Number })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return LoteInsumoPresenter.toHttp(
      await this.changeLoteInsumoStatus.execute(id, true),
    );
  }
}
