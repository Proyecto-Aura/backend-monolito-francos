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
import { ValidarRelacionesOeService } from '../application/use-cases/objetivo-estrategico/validar-relaciones-oe.service';
import { ListPerspectivasBscUseCase } from '../application/use-cases/perspectiva-bsc/list-perspectivas-bsc.use-case';
import { EstadoPlanEstrategicoRepository } from '../domain/repositories/estado-plan-estrategico.repository';
import { EstadoObjetivoRepository } from '../domain/repositories/estado-objetivo.repository';
import { ObjetivoEstrategicoRepository } from '../domain/repositories/objetivo-estrategico.repository';
import { PerspectivaBscRepository } from '../domain/repositories/perspectiva-bsc.repository';
import { PlanEstrategicoRepository } from '../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../domain/repositories/tipo-modulo.repository';
import { PrismaEstadoPlanEstrategicoRepository } from '../infrastructure/repositories/prisma-estado-plan-estrategico.repository';
import { PrismaEstadoObjetivoRepository } from '../infrastructure/repositories/prisma-estado-objetivo.repository';
import { PrismaObjetivoEstrategicoRepository } from '../infrastructure/repositories/prisma-objetivo-estrategico.repository';
import { PrismaPerspectivaBscRepository } from '../infrastructure/repositories/prisma-perspectiva-bsc.repository';
import { PrismaPlanEstrategicoRepository } from '../infrastructure/repositories/prisma-plan-estrategico.repository';
import { PrismaTipoModuloRepository } from '../infrastructure/repositories/prisma-tipo-modulo.repository';
import { ObjetivosEstrategicosController } from './controllers/objetivos-estrategicos.controller';
import { PerspectivasBscController } from './controllers/perspectivas-bsc.controller';
import { PlanesEstrategicosController } from './controllers/planes-estrategicos.controller';
import { StrategicDomainExceptionFilter } from './filters/strategic-domain-exception.filter';

@Module({
  controllers: [
    PlanesEstrategicosController,
    ObjetivosEstrategicosController,
    PerspectivasBscController,
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
    ValidarRelacionesOeService,
    ListPerspectivasBscUseCase,
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
      provide: APP_FILTER,
      useClass: StrategicDomainExceptionFilter,
    },
  ],
})
export class StrategicModule {}
