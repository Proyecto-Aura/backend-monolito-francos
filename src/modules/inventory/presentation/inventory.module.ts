import { Module } from '@nestjs/common';
import { CreateInsumoUseCase } from '../application/use-cases/insumo/create-insumo.use-case';
import { GetInsumoByIdUseCase } from '../application/use-cases/insumo/get-insumo-by-id.use-case';
import { ListInsumosUseCase } from '../application/use-cases/insumo/list-insumos.use-case';
import { UpdateInsumoUseCase } from '../application/use-cases/insumo/update-insumo.use-case';
import { ChangeInsumoStatusUseCase } from '../application/use-cases/insumo/change-insumo-status.use-case';
import { GetIndicadoresInsumoUseCase } from '../application/use-cases/insumo/get-indicadores-insumo.use-case';
import { CreateLoteInsumoUseCase } from '../application/use-cases/lote-insumo/create-lote-insumo.use-case';
import { GetLoteInsumoByIdUseCase } from '../application/use-cases/lote-insumo/get-lote-insumo-by-id.use-case';
import { ListLoteInsumosUseCase } from '../application/use-cases/lote-insumo/list-lote-insumos.use-case';
import { ChangeLoteInsumoStatusUseCase } from '../application/use-cases/lote-insumo/change-lote-insumo-status.use-case';
import { RegistrarEntradaInsumoUseCase } from '../application/use-cases/movimiento-insumo/registrar-entrada-insumo.use-case';
import { RegistrarSalidaInsumoUseCase } from '../application/use-cases/movimiento-insumo/registrar-salida-insumo.use-case';
import { RegistrarAjusteInsumoUseCase } from '../application/use-cases/movimiento-insumo/registrar-ajuste-insumo.use-case';
import { GetMovimientoByIdUseCase } from '../application/use-cases/movimiento-insumo/get-movimiento-by-id.use-case';
import { ListMovimientosUseCase } from '../application/use-cases/movimiento-insumo/list-movimientos.use-case';
import { GetIndicadoresProductoTerminadoUseCase } from '../application/use-cases/producto-terminado/get-indicadores-producto-terminado.use-case';
import { UpdateProductoTerminadoUseCase } from '../application/use-cases/producto-terminado/update-producto-terminado.use-case';
import { GetLoteProductoTerminadoByIdUseCase } from '../application/use-cases/lote-producto-terminado/get-lote-producto-terminado-by-id.use-case';
import { ListLotesProductoTerminadoUseCase } from '../application/use-cases/lote-producto-terminado/list-lotes-producto-terminado.use-case';
import { RegistrarEntradaProductoTerminadoUseCase } from '../application/use-cases/movimiento-producto-terminado/registrar-entrada-producto-terminado.use-case';
import { RegistrarSalidaProductoTerminadoUseCase } from '../application/use-cases/movimiento-producto-terminado/registrar-salida-producto-terminado.use-case';
import { RegistrarAjusteProductoTerminadoUseCase } from '../application/use-cases/movimiento-producto-terminado/registrar-ajuste-producto-terminado.use-case';
import { GetMovimientoProductoTerminadoByIdUseCase } from '../application/use-cases/movimiento-producto-terminado/get-movimiento-producto-terminado-by-id.use-case';
import { ListMovimientosProductoTerminadoUseCase } from '../application/use-cases/movimiento-producto-terminado/list-movimientos-producto-terminado.use-case';
import { InsumoRepository } from '../domain/repositories/insumo.repository';
import { LoteInsumoRepository } from '../domain/repositories/lote-insumo.repository';
import { LoteProductoTerminadoRepository } from '../domain/repositories/lote-producto-terminado.repository';
import { MovimientoInsumoRepository } from '../domain/repositories/movimiento-insumo.repository';
import { MovimientoProductoTerminadoRepository } from '../domain/repositories/movimiento-producto-terminado.repository';
import { ProductoTerminadoRepository } from '../domain/repositories/producto-terminado.repository';
import { PrismaInsumoRepository } from '../infrastructure/repositories/prisma-insumo.repository';
import { PrismaLoteInsumoRepository } from '../infrastructure/repositories/prisma-lote-insumo.repository';
import { PrismaLoteProductoTerminadoRepository } from '../infrastructure/repositories/prisma-lote-producto-terminado.repository';
import { PrismaMovimientoInsumoRepository } from '../infrastructure/repositories/prisma-movimiento-insumo.repository';
import { PrismaMovimientoProductoTerminadoRepository } from '../infrastructure/repositories/prisma-movimiento-producto-terminado.repository';
import { PrismaProductoTerminadoRepository } from '../infrastructure/repositories/prisma-producto-terminado.repository';
import { InsumosController } from './controllers/insumos.controller';
import { LotesInsumoController } from './controllers/lotes-insumo.controller';
import { LotesProductoTerminadoController } from './controllers/lotes-producto-terminado.controller';
import { MovimientosInsumoController } from './controllers/movimientos-insumo.controller';
import { MovimientosProductoTerminadoController } from './controllers/movimientos-producto-terminado.controller';
import { ProductosTerminadosController } from './controllers/productos-terminados.controller';

// El filtro de errores de dominio (CatalogDomainExceptionFilter) sigue
// registrado como APP_FILTER en CatalogModule; al ser global, también
// captura las excepciones que lanzan los use-cases de este módulo.
@Module({
  controllers: [
    InsumosController,
    LotesInsumoController,
    MovimientosInsumoController,
    ProductosTerminadosController,
    LotesProductoTerminadoController,
    MovimientosProductoTerminadoController,
  ],
  providers: [
    CreateInsumoUseCase,
    GetInsumoByIdUseCase,
    ListInsumosUseCase,
    UpdateInsumoUseCase,
    ChangeInsumoStatusUseCase,
    GetIndicadoresInsumoUseCase,
    { provide: InsumoRepository, useClass: PrismaInsumoRepository },
    CreateLoteInsumoUseCase,
    GetLoteInsumoByIdUseCase,
    ListLoteInsumosUseCase,
    ChangeLoteInsumoStatusUseCase,
    { provide: LoteInsumoRepository, useClass: PrismaLoteInsumoRepository },
    RegistrarEntradaInsumoUseCase,
    RegistrarSalidaInsumoUseCase,
    RegistrarAjusteInsumoUseCase,
    GetMovimientoByIdUseCase,
    ListMovimientosUseCase,
    {
      provide: MovimientoInsumoRepository,
      useClass: PrismaMovimientoInsumoRepository,
    },
    UpdateProductoTerminadoUseCase,
    GetIndicadoresProductoTerminadoUseCase,
    {
      provide: ProductoTerminadoRepository,
      useClass: PrismaProductoTerminadoRepository,
    },
    GetLoteProductoTerminadoByIdUseCase,
    ListLotesProductoTerminadoUseCase,
    {
      provide: LoteProductoTerminadoRepository,
      useClass: PrismaLoteProductoTerminadoRepository,
    },
    RegistrarEntradaProductoTerminadoUseCase,
    RegistrarSalidaProductoTerminadoUseCase,
    RegistrarAjusteProductoTerminadoUseCase,
    GetMovimientoProductoTerminadoByIdUseCase,
    ListMovimientosProductoTerminadoUseCase,
    {
      provide: MovimientoProductoTerminadoRepository,
      useClass: PrismaMovimientoProductoTerminadoRepository,
    },
  ],
})
export class InventoryModule {}
