import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ActivarPlanEstrategicoUseCase } from '../application/use-cases/plan-estrategico/activar-plan-estrategico.use-case';
import { CerrarPlanEstrategicoUseCase } from '../application/use-cases/plan-estrategico/cerrar-plan-estrategico.use-case';
import { CreatePlanEstrategicoUseCase } from '../application/use-cases/plan-estrategico/create-plan-estrategico.use-case';
import { EliminarPlanEstrategicoUseCase } from '../application/use-cases/plan-estrategico/eliminar-plan-estrategico.use-case';
import { GetPlanEstrategicoByIdUseCase } from '../application/use-cases/plan-estrategico/get-plan-estrategico-by-id.use-case';
import { ListPlanesEstrategicosUseCase } from '../application/use-cases/plan-estrategico/list-planes-estrategicos.use-case';
import { UpdatePlanEstrategicoUseCase } from '../application/use-cases/plan-estrategico/update-plan-estrategico.use-case';
import { EstadoPlanEstrategicoRepository } from '../domain/repositories/estado-plan-estrategico.repository';
import { PlanEstrategicoRepository } from '../domain/repositories/plan-estrategico.repository';
import { PrismaEstadoPlanEstrategicoRepository } from '../infrastructure/repositories/prisma-estado-plan-estrategico.repository';
import { PrismaPlanEstrategicoRepository } from '../infrastructure/repositories/prisma-plan-estrategico.repository';
import { PlanesEstrategicosController } from './controllers/planes-estrategicos.controller';
import { StrategicDomainExceptionFilter } from './filters/strategic-domain-exception.filter';

@Module({
  controllers: [PlanesEstrategicosController],
  providers: [
    CreatePlanEstrategicoUseCase,
    GetPlanEstrategicoByIdUseCase,
    ListPlanesEstrategicosUseCase,
    UpdatePlanEstrategicoUseCase,
    EliminarPlanEstrategicoUseCase,
    ActivarPlanEstrategicoUseCase,
    CerrarPlanEstrategicoUseCase,
    {
      provide: EstadoPlanEstrategicoRepository,
      useClass: PrismaEstadoPlanEstrategicoRepository,
    },
    {
      provide: PlanEstrategicoRepository,
      useClass: PrismaPlanEstrategicoRepository,
    },
    {
      provide: APP_FILTER,
      useClass: StrategicDomainExceptionFilter,
    },
  ],
})
export class StrategicModule {}
