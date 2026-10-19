import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_AUTHENTICATED_ONLY_KEY } from '../decorators/authenticated.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const getAllAndOverride = jest.fn();
  const reflector = {
    getAllAndOverride,
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  const createContext = (roles?: string[]) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => (roles ? { user: { roles } } : {}),
      }),
    }) as unknown as ExecutionContext;

  const mockMetadata = (
    isPublic: boolean,
    requiredRoles?: string[],
    authenticatedOnly?: boolean,
  ): void => {
    getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return isPublic;
      if (key === ROLES_KEY) return requiredRoles;
      if (key === IS_AUTHENTICATED_ONLY_KEY) return authenticatedOnly;
      return undefined;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('permite el acceso cuando la ruta está marcada con @Public()', () => {
    mockMetadata(true, ['admin']);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('deniega el acceso cuando no hay @Roles', () => {
    mockMetadata(false);

    expect(guard.canActivate(createContext(['admin']))).toBe(false);
  });

  it("permite el acceso con @Roles('admin') y rol admin", () => {
    mockMetadata(false, ['admin']);

    expect(guard.canActivate(createContext(['admin']))).toBe(true);
  });

  it("deniega el acceso con @Roles('admin') y rol ventas", () => {
    mockMetadata(false, ['admin']);

    expect(guard.canActivate(createContext(['ventas']))).toBe(false);
  });

  it("deniega sin lanzar cuando hay @Roles('admin') pero no hay usuario", () => {
    mockMetadata(false, ['admin']);

    expect(() => guard.canActivate(createContext())).not.toThrow();
    expect(guard.canActivate(createContext())).toBe(false);
  });

  it('permite el acceso con @Authenticated() sin importar el rol', () => {
    mockMetadata(false, undefined, true);

    expect(guard.canActivate(createContext(['ventas']))).toBe(true);
  });

  it('@Authenticated() no exime de estar logueado (lo exige JwtAuthGuard antes)', () => {
    mockMetadata(false, undefined, true);

    expect(guard.canActivate(createContext())).toBe(true);
  });
});
