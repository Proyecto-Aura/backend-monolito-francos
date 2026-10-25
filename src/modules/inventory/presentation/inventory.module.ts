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
import { InsumoRepository } from '../domain/repositories/insumo.repository';
import { LoteInsumoRepository } from '../domain/repositories/lote-insumo.repository';
import { PrismaInsumoRepository } from '../infrastructure/repositories/prisma-insumo.repository';
import { PrismaLoteInsumoRepository } from '../infrastructure/repositories/prisma-lote-insumo.repository';
import { InsumosController } from './controllers/insumos.controller';
import { LotesInsumoController } from './controllers/lotes-insumo.controller';

// El filtro de errores de dominio (CatalogDomainExceptionFilter) sigue
// registrado como APP_FILTER en CatalogModule; al ser global, también
// captura las excepciones que lanzan los use-cases de este módulo.
@Module({
  controllers: [InsumosController, LotesInsumoController],
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
  ],
})
export class InventoryModule {}
