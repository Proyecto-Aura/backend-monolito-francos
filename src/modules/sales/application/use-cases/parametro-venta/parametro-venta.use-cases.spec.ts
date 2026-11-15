import { ParametroVentaEntity } from '../../../domain/entities/parametro-venta.entity';
import { InvalidRequestError } from '../../../domain/errors/sales-domain.errors';
import { ParametroVentaRepository } from '../../../domain/repositories/parametro-venta.repository';
import { GetParametroVentaUseCase } from './get-parametro-venta.use-case';
import { UpdateParametroVentaUseCase } from './update-parametro-venta.use-case';

describe('Parámetros de ventas (HU-A-045)', () => {
  const get = jest.fn();
  const update = jest.fn();
  const repository = { get, update } as unknown as ParametroVentaRepository;

  const parametros = (
    overrides: Partial<ParametroVentaEntity> = {},
  ): ParametroVentaEntity => ({
    umbral_mayorista_global: 24,
    umbral_por_producto: true,
    promociones_activas: true,
    culqi_activo: true,
    efectivo_activo: true,
    updated_at: new Date('2026-11-14T10:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    get.mockResolvedValue(parametros());
    // El repositorio real ignora los campos `undefined`; el mock hace lo mismo.
    update.mockImplementation((params: object) =>
      Promise.resolve(
        parametros(
          Object.fromEntries(
            Object.entries(params).filter(([, valor]) => valor !== undefined),
          ),
        ),
      ),
    );
  });

  describe('GetParametroVentaUseCase', () => {
    it('devuelve los parámetros vigentes', async () => {
      const resultado = await new GetParametroVentaUseCase(
        repository,
      ).execute();

      expect(resultado).toEqual(parametros());
    });
  });

  describe('UpdateParametroVentaUseCase', () => {
    const useCase = new UpdateParametroVentaUseCase(repository);

    it('actualiza solo lo que llega (RF-A193)', async () => {
      await useCase.execute({ umbral_mayorista_global: 36 });

      expect(update).toHaveBeenCalledWith({
        umbral_mayorista_global: 36,
        umbral_por_producto: undefined,
        promociones_activas: undefined,
        culqi_activo: undefined,
        efectivo_activo: undefined,
      });
    });

    it('permite apagar las promociones (RF-A194)', async () => {
      const resultado = await useCase.execute({ promociones_activas: false });

      expect(resultado.promociones_activas).toBe(false);
    });

    it('permite apagar un método de pago si queda el otro (RF-A195)', async () => {
      const resultado = await useCase.execute({ efectivo_activo: false });

      expect(resultado.efectivo_activo).toBe(false);
      expect(resultado.culqi_activo).toBe(true);
    });

    it('lanza 400 si dejaría el portal sin ningún método de pago', async () => {
      get.mockResolvedValue(parametros({ efectivo_activo: false }));

      await expect(useCase.execute({ culqi_activo: false })).rejects.toThrow(
        new InvalidRequestError(
          'Debe quedar al menos un método de pago activo en el portal',
        ),
      );
      expect(update).not.toHaveBeenCalled();
    });

    it('lanza 400 si apaga ambos métodos en la misma petición', async () => {
      await expect(
        useCase.execute({ culqi_activo: false, efectivo_activo: false }),
      ).rejects.toThrow(InvalidRequestError);
      expect(update).not.toHaveBeenCalled();
    });
  });
});
