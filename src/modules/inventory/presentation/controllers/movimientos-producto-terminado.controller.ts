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
import { CreateAjusteMovimientoProductoTerminadoDto } from '../../application/dto/movimiento-producto-terminado-dtos/create-ajuste-movimiento.dto';
import { CreateEntradaMovimientoProductoTerminadoDto } from '../../application/dto/movimiento-producto-terminado-dtos/create-entrada-movimiento.dto';
import { CreateSalidaMovimientoProductoTerminadoDto } from '../../application/dto/movimiento-producto-terminado-dtos/create-salida-movimiento.dto';
import { ListMovimientosProductoTerminadoQueryDto } from '../../application/dto/movimiento-producto-terminado-dtos/list-movimientos-query.dto';
import { GetMovimientoProductoTerminadoByIdUseCase } from '../../application/use-cases/movimiento-producto-terminado/get-movimiento-producto-terminado-by-id.use-case';
import { ListMovimientosProductoTerminadoUseCase } from '../../application/use-cases/movimiento-producto-terminado/list-movimientos-producto-terminado.use-case';
import { RegistrarAjusteProductoTerminadoUseCase } from '../../application/use-cases/movimiento-producto-terminado/registrar-ajuste-producto-terminado.use-case';
import { RegistrarEntradaProductoTerminadoUseCase } from '../../application/use-cases/movimiento-producto-terminado/registrar-entrada-producto-terminado.use-case';
import { RegistrarSalidaProductoTerminadoUseCase } from '../../application/use-cases/movimiento-producto-terminado/registrar-salida-producto-terminado.use-case';
import {
  validarFila,
  validarFilas,
} from '../../application/utils/validar-fila-movimiento.util';
import { MovimientoProductoTerminadoPresenter } from '../presenters/movimiento-producto-terminado.presenter';

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

// Kardex de producto terminado (OFT0-259), mismo patrón que movimientos de
// insumo: historial inmutable. Solo se crea (vía acciones de negocio
// concretas: entrada, salida, ajuste) y se lee. Sin PATCH ni DELETE a
// propósito.
@ApiTags('Movimientos de producto terminado')
@ApiBearerAuth()
@ApiExtraModels(
  CreateEntradaMovimientoProductoTerminadoDto,
  CreateSalidaMovimientoProductoTerminadoDto,
  CreateAjusteMovimientoProductoTerminadoDto,
)
@Roles('admin', 'inventario')
@Controller('movimientos-producto-terminado')
export class MovimientosProductoTerminadoController {
  constructor(
    private readonly registrarEntradaProductoTerminado: RegistrarEntradaProductoTerminadoUseCase,
    private readonly registrarSalidaProductoTerminado: RegistrarSalidaProductoTerminadoUseCase,
    private readonly registrarAjusteProductoTerminado: RegistrarAjusteProductoTerminadoUseCase,
    private readonly getMovimientoProductoTerminadoById: GetMovimientoProductoTerminadoByIdUseCase,
    private readonly listMovimientosProductoTerminado: ListMovimientosProductoTerminadoUseCase,
  ) {}

  @Post('entrada')
  @ApiOperation({
    summary:
      'Sumar cantidad a un lote existente (p.ej. una hornada adicional del mismo lote). Acepta un objeto o un array de filas; un array se guarda todo o nada en una sola transacción.',
  })
  @ApiBody(bodySchema(CreateEntradaMovimientoProductoTerminadoDto))
  @ApiCreatedResponse({
    description:
      'Movimiento de entrada creado (o varios, si se mandó un array)',
  })
  async entrada(@Body() body: unknown) {
    if (Array.isArray(body)) {
      const filas = await validarFilas(
        CreateEntradaMovimientoProductoTerminadoDto,
        body,
      );
      return MovimientoProductoTerminadoPresenter.listToHttp(
        await this.registrarEntradaProductoTerminado.executeMany(filas),
      );
    }

    const dto = await validarFila(
      CreateEntradaMovimientoProductoTerminadoDto,
      body,
    );
    return MovimientoProductoTerminadoPresenter.toHttp(
      await this.registrarEntradaProductoTerminado.execute(dto),
    );
  }

  @Post('salida')
  @ApiOperation({
    summary:
      'Registrar una salida de producto terminado (reparto FEFO entre lotes activos). Acepta un objeto o un array de filas; un array se guarda todo o nada en una sola transacción.',
  })
  @ApiBody(bodySchema(CreateSalidaMovimientoProductoTerminadoDto))
  @ApiCreatedResponse({
    description: 'Uno o más movimientos de salida, según los lotes tocados',
  })
  async salida(@Body() body: unknown) {
    if (Array.isArray(body)) {
      const filas = await validarFilas(
        CreateSalidaMovimientoProductoTerminadoDto,
        body,
      );
      return MovimientoProductoTerminadoPresenter.listToHttp(
        await this.registrarSalidaProductoTerminado.executeMany(filas),
      );
    }

    const dto = await validarFila(
      CreateSalidaMovimientoProductoTerminadoDto,
      body,
    );
    return MovimientoProductoTerminadoPresenter.listToHttp(
      await this.registrarSalidaProductoTerminado.execute(dto),
    );
  }

  @Post('ajuste')
  @ApiOperation({
    summary:
      'Registrar un ajuste manual sobre un lote. Acepta un objeto o un array de filas; un array se guarda todo o nada en una sola transacción.',
  })
  @ApiBody(bodySchema(CreateAjusteMovimientoProductoTerminadoDto))
  @ApiCreatedResponse({
    description: 'Movimiento de ajuste creado (o varios, si se mandó un array)',
  })
  async ajuste(@Body() body: unknown) {
    if (Array.isArray(body)) {
      const filas = await validarFilas(
        CreateAjusteMovimientoProductoTerminadoDto,
        body,
      );
      return MovimientoProductoTerminadoPresenter.listToHttp(
        await this.registrarAjusteProductoTerminado.executeMany(filas),
      );
    }

    const dto = await validarFila(
      CreateAjusteMovimientoProductoTerminadoDto,
      body,
    );
    return MovimientoProductoTerminadoPresenter.toHttp(
      await this.registrarAjusteProductoTerminado.execute(dto),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get()
  @ApiOperation({
    summary: 'Listar movimientos de producto terminado (kardex)',
  })
  @ApiOkResponse({ description: 'Lista paginada de movimientos' })
  async findAll(@Query() query: ListMovimientosProductoTerminadoQueryDto) {
    return MovimientoProductoTerminadoPresenter.paginatedToHttp(
      await this.listMovimientosProductoTerminado.execute(query),
    );
  }

  @Roles('admin', 'inventario', 'produccion')
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un movimiento de producto terminado por ID',
  })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return MovimientoProductoTerminadoPresenter.toHttp(
      await this.getMovimientoProductoTerminadoById.execute(id),
    );
  }
}
