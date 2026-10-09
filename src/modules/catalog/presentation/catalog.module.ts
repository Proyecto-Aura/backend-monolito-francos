import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CreateCategoriaUseCase } from '../application/use-cases/categoria/create-categoria.use-case';
import { GetCategoriaByIdUseCase } from '../application/use-cases/categoria/get-categoria-by-id.use-case';
import { ListCategoriasUseCase } from '../application/use-cases/categoria/list-categorias.use-case';
import { UpdateCategoriaUseCase } from '../application/use-cases/categoria/update-categoria.use-case';
import { ChangeCategoriaStatusUseCase } from '../application/use-cases/categoria/change-categoria-status.use-case';
import { CreatePresentacionUseCase } from '../application/use-cases/presentacion/create-presentacion.use-case';
import { GetPresentacionUseCase } from '../application/use-cases/presentacion/get-presentacion.use-case';
import { ListPresentacionUseCase } from '../application/use-cases/presentacion/list-presentacion.use-case';
import { UpdatePresentacionUseCase } from '../application/use-cases/presentacion/update-presentacion.use-case';
import { ChangePresentacionStatusUseCase } from '../application/use-cases/presentacion/change-presentacion-status.use-case';
import { CreateProductoUseCase } from '../application/use-cases/producto/create-producto.use-case';
import { GetProductoByIdUseCase } from '../application/use-cases/producto/get-producto-by-id.use-case';
import { ListProductosUseCase } from '../application/use-cases/producto/list-producto.use-case';
import { UpdateProductoUseCase } from '../application/use-cases/producto/update-producto.use-case';
import { ChangeProductoStatusUseCase } from '../application/use-cases/producto/change-producto-status.use-case';
import { CreateProductoPresentacionUseCase } from '../application/use-cases/producto_presentacion/create-producto_presentacion.use-case';
import { GetProductoPresentacionUseCase } from '../application/use-cases/producto_presentacion/get-producto_presentacion.use-case';
import { ListProductoPresentacionesUseCase } from '../application/use-cases/producto_presentacion/list-producto_presentacion.use-case';
import { UpdateProductoPresentacionUseCase } from '../application/use-cases/producto_presentacion/update-producto_presentacion.use-case';
import { ChangeProductoPresentacionStatusUseCase } from '../application/use-cases/producto_presentacion/change-producto_presentacion-status.use-case';
import { SubirImagenProductoPresentacionUseCase } from '../application/use-cases/producto_presentacion/subir-imagen-producto_presentacion.use-case';
import { CreatePromocionUseCase } from '../application/use-cases/promocion/create-promocion.use-case';
import { GetPromocionByIdUseCase } from '../application/use-cases/promocion/get-promocion-by-id.use-case';
import { ListPromocionesUseCase } from '../application/use-cases/promocion/list-promociones.use-case';
import { UpdatePromocionUseCase } from '../application/use-cases/promocion/update-promocion.use-case';
import { ChangePromocionStatusUseCase } from '../application/use-cases/promocion/change-promocion-status.use-case';
import { CategoriaRepository } from '../domain/repositories/categoria.repository';
import { PresentacionRepository } from '../domain/repositories/presentacion.repository';
import { ProductoRepository } from '../domain/repositories/producto.repository';
import { ProductoPresentacionRepository } from '../domain/repositories/producto_presentacion.repository';
import { ProductoTerminadoRepository } from '../domain/repositories/producto-terminado.repository';
import { PromocionRepository } from '../domain/repositories/promocion.repository';
import { PrismaCategoriaRepository } from '../infrastructure/repositories/prisma-categoria.repository';
import { PrismaPresentacionRepository } from '../infrastructure/repositories/prisma-presentacion.repository';
import { PrismaProductoRepository } from '../infrastructure/repositories/prisma-producto.repository';
import { PrismaProductoPresentacionRepository } from '../infrastructure/repositories/prisma-producto_presentacion.repository';
import { PrismaProductoTerminadoRepository } from '../infrastructure/repositories/prisma-producto-terminado.repository';
import { PrismaPromocionRepository } from '../infrastructure/repositories/prisma-promocion.repository';
import { CategoriasController } from './controllers/categorias.controller';
import { PresentacionesController } from './controllers/presentaciones.controller';
import { ProductoPresentacionesController } from './controllers/producto-presentaciones.controller';
import { ProductosController } from './controllers/productos.controller';
import { PromocionesController } from './controllers/promociones.controller';
import { CatalogDomainExceptionFilter } from './filters/catalog-domain-exception.filter';

@Module({
  controllers: [
    CategoriasController,
    PresentacionesController,
    ProductosController,
    ProductoPresentacionesController,
    PromocionesController,
  ],
  providers: [
    CreateCategoriaUseCase,
    GetCategoriaByIdUseCase,
    ListCategoriasUseCase,
    UpdateCategoriaUseCase,
    ChangeCategoriaStatusUseCase,
    { provide: CategoriaRepository, useClass: PrismaCategoriaRepository },
    CreatePresentacionUseCase,
    GetPresentacionUseCase,
    ListPresentacionUseCase,
    UpdatePresentacionUseCase,
    ChangePresentacionStatusUseCase,
    { provide: PresentacionRepository, useClass: PrismaPresentacionRepository },
    CreateProductoUseCase,
    GetProductoByIdUseCase,
    ListProductosUseCase,
    UpdateProductoUseCase,
    ChangeProductoStatusUseCase,
    { provide: ProductoRepository, useClass: PrismaProductoRepository },
    CreateProductoPresentacionUseCase,
    GetProductoPresentacionUseCase,
    ListProductoPresentacionesUseCase,
    UpdateProductoPresentacionUseCase,
    ChangeProductoPresentacionStatusUseCase,
    SubirImagenProductoPresentacionUseCase,
    {
      provide: ProductoPresentacionRepository,
      useClass: PrismaProductoPresentacionRepository,
    },
    CreatePromocionUseCase,
    GetPromocionByIdUseCase,
    ListPromocionesUseCase,
    UpdatePromocionUseCase,
    ChangePromocionStatusUseCase,
    { provide: PromocionRepository, useClass: PrismaPromocionRepository },
    {
      provide: ProductoTerminadoRepository,
      useClass: PrismaProductoTerminadoRepository,
    },
    {
      provide: APP_FILTER,
      useClass: CatalogDomainExceptionFilter,
    },
  ],
})
export class CatalogModule {}
