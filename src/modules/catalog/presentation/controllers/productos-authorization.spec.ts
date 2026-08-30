/* eslint-disable @typescript-eslint/unbound-method */
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../../auth/presentation/guards/roles.guard';
import { ProductoPresentacionesController } from './producto-presentaciones.controller';
import { ProductosController } from './productos.controller';

describe('Autorización de escrituras de producto', () => {
  const reflector = new Reflector();

  const contextFor = (
    controller: new (...args: never[]) => object,
    handler: (...args: never[]) => unknown,
    roles: string[],
  ) =>
    ({
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({ user: { roles } }),
      }),
    }) as unknown as ExecutionContext;

  it.each([
    ProductosController.prototype.create,
    ProductosController.prototype.update,
    ProductosController.prototype.deactivate,
    ProductosController.prototype.activate,
    ProductoPresentacionesController.prototype.create,
    ProductoPresentacionesController.prototype.update,
    ProductoPresentacionesController.prototype.deactivate,
    ProductoPresentacionesController.prototype.activate,
  ])('declara roles admin y ventas en cada escritura', (handler) => {
    expect(reflector.get<string[]>(ROLES_KEY, handler)).toEqual([
      'admin',
      'ventas',
    ]);
  });

  it('autoriza ventas y rechaza roles ajenos', () => {
    const guard = new RolesGuard(reflector);
    const handler = ProductosController.prototype.update as (
      ...args: never[]
    ) => unknown;

    expect(
      guard.canActivate(contextFor(ProductosController, handler, ['ventas'])),
    ).toBe(true);
    expect(
      guard.canActivate(contextFor(ProductosController, handler, ['cliente'])),
    ).toBe(false);
  });
});
