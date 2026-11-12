import * as bcrypt from 'bcrypt';
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from '../../domain/errors/auth-domain.errors';
import { CambiarContrasenaDto } from '../dto/cambiar-contrasena.dto';
import {
  CONTRASENA_ACTUAL_INCORRECTA,
  CONTRASENA_IGUAL_A_LA_ACTUAL,
  CambiarContrasenaUseCase,
} from './cambiar-contrasena.use-case';

describe('CambiarContrasenaUseCase (HU-B-017, RF-B45)', () => {
  const findCredenciales = jest.fn();
  const cambiarContrasena = jest.fn();
  const useCase = new CambiarContrasenaUseCase({
    findCredenciales,
    cambiarContrasena,
  });

  const USER_ID = 'b6a1f1d2-1111-4c1a-9a0e-3b5b2f6f0001';
  const SESION_ID = 'c7b2e2e3-2222-4d2b-8b1f-4c6c3a7a0002';
  const ACTUAL = 'Actual1234';
  let hashActual: string;

  const dto = (
    overrides: Partial<CambiarContrasenaDto> = {},
  ): CambiarContrasenaDto => ({
    contrasena_actual: ACTUAL,
    nueva_contrasena: 'Nueva1234',
    confirmar_contrasena: 'Nueva1234',
    ...overrides,
  });

  beforeAll(async () => {
    hashActual = await bcrypt.hash(ACTUAL, 4);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    findCredenciales.mockResolvedValue({
      id: USER_ID,
      contrasena: hashActual,
      estado: true,
    });
    cambiarContrasena.mockResolvedValue(undefined);
  });

  it('con la contraseña actual correcta guarda la nueva cifrada y mantiene la sesión actual', async () => {
    await useCase.execute(USER_ID, SESION_ID, dto());

    expect(cambiarContrasena).toHaveBeenCalledTimes(1);
    const [params] = cambiarContrasena.mock.calls[0] as [
      { userId: string; contrasenaHash: string; sesionActualId: string },
    ];
    expect(params.userId).toBe(USER_ID);
    expect(params.sesionActualId).toBe(SESION_ID);
    expect(params.contrasenaHash).not.toBe('Nueva1234');
    await expect(
      bcrypt.compare('Nueva1234', params.contrasenaHash),
    ).resolves.toBe(true);
  });

  it('rechaza si la contraseña actual no es correcta, sin cambiar nada', async () => {
    await expect(
      useCase.execute(
        USER_ID,
        SESION_ID,
        dto({ contrasena_actual: 'Otra1234' }),
      ),
    ).rejects.toThrow(new InvalidRequestError(CONTRASENA_ACTUAL_INCORRECTA));

    expect(cambiarContrasena).not.toHaveBeenCalled();
  });

  it('rechaza una nueva contraseña igual a la actual', async () => {
    await expect(
      useCase.execute(
        USER_ID,
        SESION_ID,
        dto({ nueva_contrasena: ACTUAL, confirmar_contrasena: ACTUAL }),
      ),
    ).rejects.toThrow(new InvalidRequestError(CONTRASENA_IGUAL_A_LA_ACTUAL));

    expect(cambiarContrasena).not.toHaveBeenCalled();
  });

  it.each([
    ['no existe', null],
    ['está inactivo', { id: USER_ID, contrasena: 'x', estado: false }],
  ])('responde 404 si el usuario %s', async (_caso, usuario) => {
    findCredenciales.mockResolvedValue(usuario);

    await expect(useCase.execute(USER_ID, SESION_ID, dto())).rejects.toThrow(
      ResourceNotFoundError,
    );
    expect(cambiarContrasena).not.toHaveBeenCalled();
  });

  it('sin sesión identificada cierra todas las sesiones', async () => {
    await useCase.execute(USER_ID, null, dto());

    expect(cambiarContrasena).toHaveBeenCalledWith(
      expect.objectContaining({ sesionActualId: null }),
    );
  });
});
