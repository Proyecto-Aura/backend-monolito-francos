import { TipoComprobante } from '../../../domain/enums/sales.enums';
import {
  InvalidSerieComprobanteError,
  ResourceConflictError,
} from '../../../domain/errors/sales-domain.errors';
import { SerieComprobanteRepository } from '../../../domain/repositories/serie-comprobante.repository';
import { CreateSerieComprobanteUseCase } from './create-serie-comprobante.use-case';

describe('CreateSerieComprobanteUseCase', () => {
  const repository = {
    existsBySerie: jest.fn(),
    existsActivaByTipo: jest.fn(),
    create: jest.fn(),
  };
  const useCase = new CreateSerieComprobanteUseCase(
    repository as unknown as SerieComprobanteRepository,
  );
  const dto = {
    tipo: TipoComprobante.BOLETA,
    serie: 'B001',
    correlativo_inicio: 1,
    correlativo_fin: 99999999,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.existsBySerie.mockResolvedValue(false);
    repository.existsActivaByTipo.mockResolvedValue(false);
    repository.create.mockImplementation((params: object) =>
      Promise.resolve(params),
    );
  });

  it('crea la serie activa, sin emitir y con umbral 100 por defecto', async () => {
    await useCase.execute(dto);

    expect(repository.create).toHaveBeenCalledWith({
      ...dto,
      correlativo_actual: 0,
      umbral_alerta: 100,
      estado: true,
    });
  });

  it('respeta el umbral y el estado enviados; inactiva no choca con la activa', async () => {
    repository.existsActivaByTipo.mockResolvedValue(true);

    await useCase.execute({
      ...dto,
      serie: 'B002',
      correlativo_inicio: 500,
      umbral_alerta: 20,
      estado: false,
    });

    expect(repository.existsActivaByTipo).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        correlativo_actual: 499,
        umbral_alerta: 20,
        estado: false,
      }),
    );
  });

  it.each([
    [TipoComprobante.BOLETA, 'F001'],
    [TipoComprobante.FACTURA, 'B001'],
  ])('rechaza con 400 un %s con serie %s', async (tipo, serie) => {
    await expect(
      useCase.execute({ ...dto, tipo, serie }),
    ).rejects.toBeInstanceOf(InvalidSerieComprobanteError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rechaza con 400 un inicio mayor que el fin', async () => {
    await expect(
      useCase.execute({ ...dto, correlativo_inicio: 10, correlativo_fin: 9 }),
    ).rejects.toBeInstanceOf(InvalidSerieComprobanteError);
  });

  it('responde 409 si el código ya existe', async () => {
    repository.existsBySerie.mockResolvedValue(true);

    await expect(useCase.execute(dto)).rejects.toThrow(
      new ResourceConflictError('Ya existe una serie con ese código'),
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('responde 409 si ya hay una serie activa del mismo tipo', async () => {
    repository.existsActivaByTipo.mockResolvedValue(true);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(repository.existsActivaByTipo).toHaveBeenCalledWith(
      TipoComprobante.BOLETA,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});
