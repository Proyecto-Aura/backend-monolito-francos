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
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
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
import {
  validarFila,
  validarFilas,
} from '../../application/utils/validar-fila-movimiento.util';
import { MovimientoInsumoPresenter } from '../presenters/movimiento-insumo.presenter';

// Schema reutilizable para los 3 endpoints de escritura: aceptan un objeto
// único (se guarda y devuelve así) o un array de filas (se guardan todas en
// una sola transacción, todo o nada, y se devuelven como array).
function bodySchema(dto: new () => object) {
  return {
    schema: {
      oneOf: [
        { $ref: getSchemaPath(dto) },
        { type: 'array', items: { $ref: getSchemaPath(dto) } },
      ],
    },
  };
}

// Kardex de insumos: historial inmutable. Solo se crea (vía acciones de
// negocio concretas: salida, ajuste — la entrada se genera sola al crear un
// lote) y se lee. Sin PATCH ni DELETE a propósito.
@ApiTags('Movimientos de insumo')
@ApiBearerAuth()
@ApiExtraModels(
  CreateEntradaMovimientoDto,
  CreateSalidaMovimientoDto,
  CreateAjusteMovimientoDto,
)
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
      'Sumar cantidad a un lote existente (p.ej. una entrega parcial adicional del mismo lote). Acepta un objeto o un array de filas; un array se guarda todo o nada en una sola transacción.',
  })
  @ApiBody(bodySchema(CreateEntradaMovimientoDto))
  @ApiCreatedResponse({
    description:
      'Movimiento de entrada creado (o varios, si se mandó un array)',
  })
  async entrada(@Body() body: unknown) {
    if (Array.isArray(body)) {
      const filas = await validarFilas(CreateEntradaMovimientoDto, body);
      return MovimientoInsumoPresenter.listToHttp(
        await this.registrarEntradaInsumo.executeMany(filas),
      );
    }

    const dto = await validarFila(CreateEntradaMovimientoDto, body);
    return MovimientoInsumoPresenter.toHttp(
      await this.registrarEntradaInsumo.execute(dto),
    );
  }

  @Post('salida')
  @ApiOperation({
    summary:
      'Registrar una salida de insumo (reparto FEFO entre lotes activos). Acepta un objeto o un array de filas; un array se guarda todo o nada en una sola transacción.',
  })
  @ApiBody(bodySchema(CreateSalidaMovimientoDto))
  @ApiCreatedResponse({
    description: 'Uno o más movimientos de salida, según los lotes tocados',
  })
  async salida(@Body() body: unknown) {
    if (Array.isArray(body)) {
      const filas = await validarFilas(CreateSalidaMovimientoDto, body);
      return MovimientoInsumoPresenter.listToHttp(
        await this.registrarSalidaInsumo.executeMany(filas),
      );
    }

    const dto = await validarFila(CreateSalidaMovimientoDto, body);
    return MovimientoInsumoPresenter.listToHttp(
      await this.registrarSalidaInsumo.execute(dto),
    );
  }

  @Post('ajuste')
  @ApiOperation({
    summary:
      'Registrar un ajuste manual sobre un lote. Acepta un objeto o un array de filas; un array se guarda todo o nada en una sola transacción.',
  })
  @ApiBody(bodySchema(CreateAjusteMovimientoDto))
  @ApiCreatedResponse({
    description: 'Movimiento de ajuste creado (o varios, si se mandó un array)',
  })
  async ajuste(@Body() body: unknown) {
    if (Array.isArray(body)) {
      const filas = await validarFilas(CreateAjusteMovimientoDto, body);
      return MovimientoInsumoPresenter.listToHttp(
        await this.registrarAjusteInsumo.executeMany(filas),
      );
    }

    const dto = await validarFila(CreateAjusteMovimientoDto, body);
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
