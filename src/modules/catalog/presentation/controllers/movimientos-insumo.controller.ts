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
import { CreateAjusteMovimientoDto } from '../../application/dto/movimiento-insumo-dtos/create-ajuste-movimiento.dto';
import { CreateEntradaMovimientoDto } from '../../application/dto/movimiento-insumo-dtos/create-entrada-movimiento.dto';
import { CreateSalidaMovimientoDto } from '../../application/dto/movimiento-insumo-dtos/create-salida-movimiento.dto';
import { ListMovimientosQueryDto } from '../../application/dto/movimiento-insumo-dtos/list-movimientos-query.dto';
import { GetMovimientoByIdUseCase } from '../../application/use-cases/movimiento-insumo/get-movimiento-by-id.use-case';
import { ListMovimientosUseCase } from '../../application/use-cases/movimiento-insumo/list-movimientos.use-case';
import { RegistrarAjusteInsumoUseCase } from '../../application/use-cases/movimiento-insumo/registrar-ajuste-insumo.use-case';
import { RegistrarEntradaInsumoUseCase } from '../../application/use-cases/movimiento-insumo/registrar-entrada-insumo.use-case';
import { RegistrarSalidaInsumoUseCase } from '../../application/use-cases/movimiento-insumo/registrar-salida-insumo.use-case';
import { MovimientoInsumoPresenter } from '../presenters/movimiento-insumo.presenter';

// Kardex de insumos: historial inmutable. Solo se crea (vía acciones de
// negocio concretas: salida, ajuste — la entrada se genera sola al crear un
// lote) y se lee. Sin PATCH ni DELETE a propósito.
@ApiTags('Movimientos de insumo')
@ApiBearerAuth()
@Roles('admin', 'inventario')
@Controller('movimientos-insumo')
export class MovimientosInsumoController {
  constructor(
    private readonly registrarEntradaInsumo: RegistrarEntradaInsumoUseCase,
    private readonly registrarSalidaInsumo: RegistrarSalidaInsumoUseCase,
    private readonly registrarAjusteInsumo: RegistrarAjusteInsumoUseCase,
    private readonly getMovimientoById: GetMovimientoByIdUseCase,
    private readonly listMovimientos: ListMovimientosUseCase,
  ) {}

  @Post('entrada')
  @ApiOperation({
    summary:
      'Sumar cantidad a un lote existente (p.ej. una entrega parcial adicional del mismo lote)',
  })
  @ApiCreatedResponse({ description: 'Movimiento de entrada creado' })
  async entrada(@Body() dto: CreateEntradaMovimientoDto) {
    return MovimientoInsumoPresenter.toHttp(
      await this.registrarEntradaInsumo.execute(dto),
    );
  }

  @Post('salida')
  @ApiOperation({
    summary:
      'Registrar una salida de insumo (reparto FEFO entre lotes activos)',
  })
  @ApiCreatedResponse({
    description: 'Uno o más movimientos de salida, según los lotes tocados',
  })
  async salida(@Body() dto: CreateSalidaMovimientoDto) {
    return MovimientoInsumoPresenter.listToHttp(
      await this.registrarSalidaInsumo.execute(dto),
    );
  }

  @Post('ajuste')
  @ApiOperation({ summary: 'Registrar un ajuste manual sobre un lote' })
  @ApiCreatedResponse({ description: 'Movimiento de ajuste creado' })
  async ajuste(@Body() dto: CreateAjusteMovimientoDto) {
    return MovimientoInsumoPresenter.toHttp(
      await this.registrarAjusteInsumo.execute(dto),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get()
  @ApiOperation({ summary: 'Listar movimientos de insumo (kardex)' })
  @ApiOkResponse({ description: 'Lista paginada de movimientos' })
  async findAll(@Query() query: ListMovimientosQueryDto) {
    return MovimientoInsumoPresenter.paginatedToHttp(
      await this.listMovimientos.execute(query),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un movimiento de insumo por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return MovimientoInsumoPresenter.toHttp(
      await this.getMovimientoById.execute(id),
    );
  }
}
