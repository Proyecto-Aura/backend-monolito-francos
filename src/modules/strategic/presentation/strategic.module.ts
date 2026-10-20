import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ActivarPlanEstrategicoUseCase } from '../application/use-cases/plan-estrategico/activar-plan-estrategico.use-case';
import { CerrarPlanEstrategicoUseCase } from '../application/use-cases/plan-estrategico/cerrar-plan-estrategico.use-case';
import { CreatePlanEstrategicoUseCase } from '../application/use-cases/plan-estrategico/create-plan-estrategico.use-case';
import { EliminarPlanEstrategicoUseCase } from '../application/use-cases/plan-estrategico/eliminar-plan-estrategico.use-case';
import { GetPlanEstrategicoByIdUseCase } from '../application/use-cases/plan-estrategico/get-plan-estrategico-by-id.use-case';
import { ListPlanesEstrategicosUseCase } from '../application/use-cases/plan-estrategico/list-planes-estrategicos.use-case';
import { ListTodosPlanesEstrategicosUseCase } from '../application/use-cases/plan-estrategico/list-todos-planes-estrategicos.use-case';
import { UpdatePlanEstrategicoUseCase } from '../application/use-cases/plan-estrategico/update-plan-estrategico.use-case';
import { CreateObjetivoEstrategicoUseCase } from '../application/use-cases/objetivo-estrategico/create-objetivo-estrategico.use-case';
import { ActualizarEstadoObjetivoUseCase } from '../application/use-cases/objetivo-estrategico/actualizar-estado-objetivo.use-case';
import { EliminarObjetivoEstrategicoUseCase } from '../application/use-cases/objetivo-estrategico/eliminar-objetivo-estrategico.use-case';
import { EliminarRelacionOeUseCase } from '../application/use-cases/objetivo-estrategico/eliminar-relacion-oe.use-case';
import { GetObjetivoEstrategicoByIdUseCase } from '../application/use-cases/objetivo-estrategico/get-objetivo-estrategico-by-id.use-case';
import { ListObjetivosEstrategicosUseCase } from '../application/use-cases/objetivo-estrategico/list-objetivos-estrategicos.use-case';
import { ListTodosObjetivosEstrategicosUseCase } from '../application/use-cases/objetivo-estrategico/list-todos-objetivos-estrategicos.use-case';
import { UpdateObjetivoEstrategicoUseCase } from '../application/use-cases/objetivo-estrategico/update-objetivo-estrategico.use-case';
import { ObtenerObjetivosPorPlanUseCase } from '../application/use-cases/objetivo-estrategico/obtener-objetivos-por-plan.use-case';
import { ObtenerObjetivosPorPlanTiUseCase } from '../application/use-cases/objetivo-estrategico/obtener-objetivos-por-plan-ti.use-case';
import { ValidarRelacionesOeService } from '../application/use-cases/objetivo-estrategico/validar-relaciones-oe.service';
import { ActualizarEstadoObjetivoTiUseCase } from '../application/use-cases/objetivo-estrategico/actualizar-estado-objetivo-ti.use-case';
import { CreateObjetivoEstrategicoTiUseCase } from '../application/use-cases/objetivo-estrategico/create-objetivo-estrategico-ti.use-case';
import { EliminarObjetivoEstrategicoTiUseCase } from '../application/use-cases/objetivo-estrategico/eliminar-objetivo-estrategico-ti.use-case';
import { GetObjetivoEstrategicoTiByIdUseCase } from '../application/use-cases/objetivo-estrategico/get-objetivo-estrategico-ti-by-id.use-case';
import { ListObjetivosEstrategicosTiUseCase } from '../application/use-cases/objetivo-estrategico/list-objetivos-estrategicos-ti.use-case';
import { ListTodosObjetivosEstrategicosTiUseCase } from '../application/use-cases/objetivo-estrategico/list-todos-objetivos-estrategicos-ti.use-case';
import { UpdateObjetivoEstrategicoTiUseCase } from '../application/use-cases/objetivo-estrategico/update-objetivo-estrategico-ti.use-case';
import { ValidarOeNegocioService } from '../application/use-cases/objetivo-estrategico/validar-oe-negocio.service';
import { ListPerspectivasBscUseCase } from '../application/use-cases/perspectiva-bsc/list-perspectivas-bsc.use-case';
import { EliminarDocumentoEstrategicoUseCase } from '../application/use-cases/documento-estrategico/eliminar-documento-estrategico.use-case';
import { ListarDocumentosEstrategicosUseCase } from '../application/use-cases/documento-estrategico/listar-documentos-estrategicos.use-case';
import { ListarTodosDocumentosEstrategicosUseCase } from '../application/use-cases/documento-estrategico/listar-todos-documentos-estrategicos.use-case';
import { ObtenerDocumentoEstrategicoByIdUseCase } from '../application/use-cases/documento-estrategico/obtener-documento-estrategico-by-id.use-case';
import { SubirDocumentoEstrategicoUseCase } from '../application/use-cases/documento-estrategico/subir-documento-estrategico.use-case';
import { CreateKpiUseCase } from '../application/use-cases/kpi/create-kpi.use-case';
import { EliminarKpiUseCase } from '../application/use-cases/kpi/eliminar-kpi.use-case';
import { ListarHistorialKpiValoresUseCase } from '../application/use-cases/kpi/listar-historial-kpi-valores.use-case';
import { ListKpisPorObjetivoUseCase } from '../application/use-cases/kpi/list-kpis-por-objetivo.use-case';
import { ObtenerKpisPorPlanUseCase } from '../application/use-cases/kpi/obtener-kpis-por-plan.use-case';
import { ObtenerUltimoKpiValorUseCase } from '../application/use-cases/kpi/obtener-ultimo-kpi-valor.use-case';
import { RegistrarKpiValorUseCase } from '../application/use-cases/kpi/registrar-kpi-valor.use-case';
import { UpdateKpiUseCase } from '../application/use-cases/kpi/update-kpi.use-case';
import { ListFrecuenciasMedicionUseCase } from '../application/use-cases/frecuencia-medicion/list-frecuencias-medicion.use-case';
import { ListPeriodosPorFrecuenciaUseCase } from '../application/use-cases/periodo/list-periodos-por-frecuencia.use-case';
import { ListUnidadesMedidaKpiUseCase } from '../application/use-cases/unidad-medida-kpi/list-unidades-medida-kpi.use-case';
import { ActualizarEstadoIniciativaUseCase } from '../application/use-cases/iniciativa/actualizar-estado-iniciativa.use-case';
import { CreateIniciativaUseCase } from '../application/use-cases/iniciativa/create-iniciativa.use-case';
import { EliminarIniciativaUseCase } from '../application/use-cases/iniciativa/eliminar-iniciativa.use-case';
import { ListIniciativasPorObjetivoUseCase } from '../application/use-cases/iniciativa/list-iniciativas-por-objetivo.use-case';
import { ObtenerIniciativasPorPlanUseCase } from '../application/use-cases/iniciativa/obtener-iniciativas-por-plan.use-case';
import { UpdateIniciativaUseCase } from '../application/use-cases/iniciativa/update-iniciativa.use-case';
import { ObtenerTableroControlUseCase } from '../application/use-cases/tablero-control/obtener-tablero-control.use-case';
import { ObtenerSeguimientoKpisUseCase } from '../application/use-cases/seguimiento-kpis/obtener-seguimiento-kpis.use-case';
import { DocumentoEstrategicoRepository } from '../domain/repositories/documento-estrategico.repository';
import { EstadoPlanEstrategicoRepository } from '../domain/repositories/estado-plan-estrategico.repository';
import { EstadoObjetivoRepository } from '../domain/repositories/estado-objetivo.repository';
import { ObjetivoEstrategicoRepository } from '../domain/repositories/objetivo-estrategico.repository';
import { PerspectivaBscRepository } from '../domain/repositories/perspectiva-bsc.repository';
import { PlanEstrategicoRepository } from '../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../domain/repositories/tipo-modulo.repository';
import { FrecuenciaMedicionRepository } from '../domain/repositories/frecuencia-medicion.repository';
import { KpiRepository } from '../domain/repositories/kpi.repository';
import { KpiValorRepository } from '../domain/repositories/kpi-valor.repository';
import { PeriodoRepository } from '../domain/repositories/periodo.repository';
import { UnidadMedidaKpiRepository } from '../domain/repositories/unidad-medida-kpi.repository';
import { EstadoIniciativaRepository } from '../domain/repositories/estado-iniciativa.repository';
import { IniciativaRepository } from '../domain/repositories/iniciativa.repository';
import { PrismaEstadoPlanEstrategicoRepository } from '../infrastructure/repositories/prisma-estado-plan-estrategico.repository';
import { PrismaEstadoObjetivoRepository } from '../infrastructure/repositories/prisma-estado-objetivo.repository';
import { PrismaObjetivoEstrategicoRepository } from '../infrastructure/repositories/prisma-objetivo-estrategico.repository';
import { PrismaPerspectivaBscRepository } from '../infrastructure/repositories/prisma-perspectiva-bsc.repository';
import { PrismaPlanEstrategicoRepository } from '../infrastructure/repositories/prisma-plan-estrategico.repository';
import { PrismaTipoModuloRepository } from '../infrastructure/repositories/prisma-tipo-modulo.repository';
import { PrismaDocumentoEstrategicoRepository } from '../infrastructure/repositories/prisma-documento-estrategico.repository';
import { PrismaFrecuenciaMedicionRepository } from '../infrastructure/repositories/prisma-frecuencia-medicion.repository';
import { PrismaKpiRepository } from '../infrastructure/repositories/prisma-kpi.repository';
import { PrismaKpiValorRepository } from '../infrastructure/repositories/prisma-kpi-valor.repository';
import { PrismaPeriodoRepository } from '../infrastructure/repositories/prisma-periodo.repository';
import { PrismaUnidadMedidaKpiRepository } from '../infrastructure/repositories/prisma-unidad-medida-kpi.repository';
import { PrismaEstadoIniciativaRepository } from '../infrastructure/repositories/prisma-estado-iniciativa.repository';
import { PrismaIniciativaRepository } from '../infrastructure/repositories/prisma-iniciativa.repository';
import { DocumentosEstrategicosController } from './controllers/documentos-estrategicos.controller';
import { FrecuenciasMedicionController } from './controllers/frecuencias-medicion.controller';
import { KpisController } from './controllers/kpis.controller';
import { ObjetivosEstrategicosController } from './controllers/objetivos-estrategicos.controller';
import { ObjetivosEstrategicosTiController } from './controllers/objetivos-estrategicos-ti.controller';
import { PeriodosController } from './controllers/periodos.controller';
import { PerspectivasBscController } from './controllers/perspectivas-bsc.controller';
import { PlanesEstrategicosController } from './controllers/planes-estrategicos.controller';
import { UnidadesMedidaKpiController } from './controllers/unidades-medida-kpi.controller';
import { IniciativasController } from './controllers/iniciativas.controller';
import { StrategicDomainExceptionFilter } from './filters/strategic-domain-exception.filter';

@Module({
  controllers: [
    PlanesEstrategicosController,
    ObjetivosEstrategicosController,
    ObjetivosEstrategicosTiController,
    PerspectivasBscController,
    DocumentosEstrategicosController,
    KpisController,
    FrecuenciasMedicionController,
    UnidadesMedidaKpiController,
    PeriodosController,
    IniciativasController,
  ],
  providers: [
    CreatePlanEstrategicoUseCase,
    GetPlanEstrategicoByIdUseCase,
    ListPlanesEstrategicosUseCase,
    ListTodosPlanesEstrategicosUseCase,
    UpdatePlanEstrategicoUseCase,
    EliminarPlanEstrategicoUseCase,
    ActivarPlanEstrategicoUseCase,
    CerrarPlanEstrategicoUseCase,
    CreateObjetivoEstrategicoUseCase,
    GetObjetivoEstrategicoByIdUseCase,
    ListObjetivosEstrategicosUseCase,
    ListTodosObjetivosEstrategicosUseCase,
    UpdateObjetivoEstrategicoUseCase,
    EliminarObjetivoEstrategicoUseCase,
    EliminarRelacionOeUseCase,
    ActualizarEstadoObjetivoUseCase,
    ObtenerObjetivosPorPlanUseCase,
    ObtenerObjetivosPorPlanTiUseCase,
    ValidarRelacionesOeService,
    CreateObjetivoEstrategicoTiUseCase,
    UpdateObjetivoEstrategicoTiUseCase,
    EliminarObjetivoEstrategicoTiUseCase,
    GetObjetivoEstrategicoTiByIdUseCase,
    ListObjetivosEstrategicosTiUseCase,
    ListTodosObjetivosEstrategicosTiUseCase,
    ActualizarEstadoObjetivoTiUseCase,
    ValidarOeNegocioService,
    ListPerspectivasBscUseCase,
    SubirDocumentoEstrategicoUseCase,
    ListarDocumentosEstrategicosUseCase,
    ListarTodosDocumentosEstrategicosUseCase,
    ObtenerDocumentoEstrategicoByIdUseCase,
    EliminarDocumentoEstrategicoUseCase,
    CreateKpiUseCase,
    UpdateKpiUseCase,
    EliminarKpiUseCase,
    ListKpisPorObjetivoUseCase,
    ObtenerKpisPorPlanUseCase,
    RegistrarKpiValorUseCase,
    ListarHistorialKpiValoresUseCase,
    ObtenerUltimoKpiValorUseCase,
    ListFrecuenciasMedicionUseCase,
    ListUnidadesMedidaKpiUseCase,
    ListPeriodosPorFrecuenciaUseCase,
    CreateIniciativaUseCase,
    UpdateIniciativaUseCase,
    EliminarIniciativaUseCase,
    ActualizarEstadoIniciativaUseCase,
    ListIniciativasPorObjetivoUseCase,
    ObtenerIniciativasPorPlanUseCase,
    ObtenerTableroControlUseCase,
    ObtenerSeguimientoKpisUseCase,
    {
      provide: EstadoPlanEstrategicoRepository,
      useClass: PrismaEstadoPlanEstrategicoRepository,
    },
    {
      provide: EstadoObjetivoRepository,
      useClass: PrismaEstadoObjetivoRepository,
    },
    {
      provide: PlanEstrategicoRepository,
      useClass: PrismaPlanEstrategicoRepository,
    },
    {
      provide: PerspectivaBscRepository,
      useClass: PrismaPerspectivaBscRepository,
    },
    {
      provide: TipoModuloRepository,
      useClass: PrismaTipoModuloRepository,
    },
    {
      provide: ObjetivoEstrategicoRepository,
      useClass: PrismaObjetivoEstrategicoRepository,
    },
    {
      provide: DocumentoEstrategicoRepository,
      useClass: PrismaDocumentoEstrategicoRepository,
    },
    {
      provide: KpiRepository,
      useClass: PrismaKpiRepository,
    },
    {
      provide: KpiValorRepository,
      useClass: PrismaKpiValorRepository,
    },
    {
      provide: UnidadMedidaKpiRepository,
      useClass: PrismaUnidadMedidaKpiRepository,
    },
    {
      provide: FrecuenciaMedicionRepository,
      useClass: PrismaFrecuenciaMedicionRepository,
    },
    {
      provide: PeriodoRepository,
      useClass: PrismaPeriodoRepository,
    },
    {
      provide: EstadoIniciativaRepository,
      useClass: PrismaEstadoIniciativaRepository,
    },
    {
      provide: IniciativaRepository,
      useClass: PrismaIniciativaRepository,
    },
    {
      provide: APP_FILTER,
      useClass: StrategicDomainExceptionFilter,
    },
  ],
})
export class StrategicModule {}
