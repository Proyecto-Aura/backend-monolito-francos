import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { AuthModule } from './modules/auth/presentation/auth.module';
import { PersonsModule } from './modules/persons/presentation/persons.module';
import { SalesModule } from './modules/sales/presentation/sales.module';
import { InventoryModule } from './modules/inventory/presentation/inventory.module';
import { ProductionModule } from './modules/production/presentation/production.module';
import { StrategicModule } from './modules/strategic/presentation/strategic.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PersonsModule,
    SalesModule,
    InventoryModule,
    ProductionModule,
    StrategicModule,
  ],
})
export class AppModule {}
