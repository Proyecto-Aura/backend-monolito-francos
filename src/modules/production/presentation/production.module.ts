import { Module } from '@nestjs/common';
import { ProductoTerminadoPersistenceModule } from '../../inventory/infrastructure/producto-terminado-persistence.module';
import { InsumoSalidaPersistenceModule } from '../../inventory/infrastructure/insumo-salida-persistence.module';
import { CambiarEstadoSolicitudProduccionUseCase } from '../application/use-cases/solicitud-produccion/cambiar-estado-solicitud-produccion.use-case';
import { CreateLoteProductoTerminadoUseCase } from '../application/use-cases/lote-producto-terminado/create-lote-producto-terminado.use-case';
import { GetLoteProductoTerminadoByIdUseCase } from '../application/use-cases/lote-producto-terminado/get-lote-producto-terminado-by-id.use-case';
import { ListLotesProductoTerminadoUseCase } from '../application/use-cases/lote-producto-terminado/list-lotes-producto-terminado.use-case';
import { CreateSolicitudProduccionUseCase } from '../application/use-cases/solicitud-produccion/create-solicitud-produccion.use-case';
import { GetSolicitudProduccionByIdUseCase } from '../application/use-cases/solicitud-produccion/get-solicitud-produccion-by-id.use-case';
import { ListSolicitudesProduccionUseCase } from '../application/use-cases/solicitud-produccion/list-solicitudes-produccion.use-case';
import { GetIndicadoresSolicitudProduccionUseCase } from '../application/use-cases/solicitud-produccion/get-indicadores-solicitud-produccion.use-case';
import { ActualizarFechaLimiteSolicitudProduccionUseCase } from '../application/use-cases/solicitud-produccion/actualizar-fecha-limite-solicitud-produccion.use-case';
import { AgregarDetalleLineaUseCase } from '../application/use-cases/solicitud-produccion-detalle/agregar-detalle-linea.use-case';
import { ActualizarDetalleLineaUseCase } from '../application/use-cases/solicitud-produccion-detalle/actualizar-detalle-linea.use-case';
import { EliminarDetalleLineaUseCase } from '../application/use-cases/solicitud-produccion-detalle/eliminar-detalle-linea.use-case';
import { CambiarEstadoSolicitudInsumosUseCase } from '../application/use-cases/solicitud-insumos/cambiar-estado-solicitud-insumos.use-case';
import { CreateSolicitudInsumosUseCase } from '../application/use-cases/solicitud-insumos/create-solicitud-insumos.use-case';
import { GetSolicitudInsumosByIdUseCase } from '../application/use-cases/solicitud-insumos/get-solicitud-insumos-by-id.use-case';
import { ListSolicitudesInsumosUseCase } from '../application/use-cases/solicitud-insumos/list-solicitudes-insumos.use-case';
import { GetIndicadoresSolicitudInsumosUseCase } from '../application/use-cases/solicitud-insumos/get-indicadores-solicitud-insumos.use-case';
import { ActualizarFechaLimiteSolicitudInsumosUseCase } from '../application/use-cases/solicitud-insumos/actualizar-fecha-limite-solicitud-insumos.use-case';
import { AgregarDetalleLineaInsumoUseCase } from '../application/use-cases/solicitud-insumos-detalle/agregar-detalle-linea.use-case';
import { ActualizarDetalleLineaInsumoUseCase } from '../application/use-cases/solicitud-insumos-detalle/actualizar-detalle-linea.use-case';
import { EliminarDetalleLineaInsumoUseCase } from '../application/use-cases/solicitud-insumos-detalle/eliminar-detalle-linea.use-case';
import { LoteProductoTerminadoRepository } from '../domain/repositories/lote-producto-terminado.repository';
import { SolicitudProduccionRepository } from '../domain/repositories/solicitud-produccion.repository';
import { SolicitudProduccionDetalleRepository } from '../domain/repositories/solicitud-produccion-detalle.repository';
import { SolicitudInsumosRepository } from '../domain/repositories/solicitud-insumos.repository';
import { SolicitudInsumosDetalleRepository } from '../domain/repositories/solicitud-insumos-detalle.repository';
import { PrismaLoteProductoTerminadoRepository } from '../infrastructure/repositories/prisma-lote-producto-terminado.repository';
import { PrismaSolicitudProduccionRepository } from '../infrastructure/repositories/prisma-solicitud-produccion.repository';
import { PrismaSolicitudProduccionDetalleRepository } from '../infrastructure/repositories/prisma-solicitud-produccion-detalle.repository';
import { PrismaSolicitudInsumosRepository } from '../infrastructure/repositories/prisma-solicitud-insumos.repository';
import { PrismaSolicitudInsumosDetalleRepository } from '../infrastructure/repositories/prisma-solicitud-insumos-detalle.repository';
import { ProduccionSolicitudesController } from './controllers/produccion-solicitudes.controller';
import { ProduccionLotesController } from './controllers/produccion-lotes.controller';
import { ProduccionSolicitudesInsumosController } from './controllers/produccion-solicitudes-insumos.controller';

@Module({
  imports: [ProductoTerminadoPersistenceModule, InsumoSalidaPersistenceModule],
  controllers: [
    ProduccionSolicitudesController,
    ProduccionLotesController,
    ProduccionSolicitudesInsumosController,
  ],
  providers: [
    CambiarEstadoSolicitudProduccionUseCase,
    CreateLoteProductoTerminadoUseCase,
    GetLoteProductoTerminadoByIdUseCase,
    ListLotesProductoTerminadoUseCase,
    CreateSolicitudProduccionUseCase,
    GetSolicitudProduccionByIdUseCase,
    ListSolicitudesProduccionUseCase,
    GetIndicadoresSolicitudProduccionUseCase,
    ActualizarFechaLimiteSolicitudProduccionUseCase,
    AgregarDetalleLineaUseCase,
    ActualizarDetalleLineaUseCase,
    EliminarDetalleLineaUseCase,
    CambiarEstadoSolicitudInsumosUseCase,
    CreateSolicitudInsumosUseCase,
    GetSolicitudInsumosByIdUseCase,
    ListSolicitudesInsumosUseCase,
    GetIndicadoresSolicitudInsumosUseCase,
    ActualizarFechaLimiteSolicitudInsumosUseCase,
    AgregarDetalleLineaInsumoUseCase,
    ActualizarDetalleLineaInsumoUseCase,
    EliminarDetalleLineaInsumoUseCase,
    {
      provide: LoteProductoTerminadoRepository,
      useClass: PrismaLoteProductoTerminadoRepository,
    },
    {
      provide: SolicitudProduccionRepository,
      useClass: PrismaSolicitudProduccionRepository,
    },
    {
      provide: SolicitudProduccionDetalleRepository,
      useClass: PrismaSolicitudProduccionDetalleRepository,
    },
    {
      provide: SolicitudInsumosRepository,
      useClass: PrismaSolicitudInsumosRepository,
    },
    {
      provide: SolicitudInsumosDetalleRepository,
      useClass: PrismaSolicitudInsumosDetalleRepository,
    },
  ],
  // Inventario usa el contrato del lote para registrar entradas, ajustes y salidas.
  exports: [LoteProductoTerminadoRepository],
})
export class ProductionModule {}
