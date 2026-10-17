import { SerieComprobanteEntity } from '../../../domain/entities/serie-comprobante.entity';
import { TipoComprobante } from '../../../domain/enums/sales.enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { SerieComprobanteRepository } from '../../../domain/repositories/serie-comprobante.repository';
import { ChangeSerieComprobanteStatusUseCase } from './change-serie-comprobante-status.use-case';

const fecha = new Date('2026-01-01T00:00:00.000Z');
const serie = (estado: boolean) =>
  new SerieComprobanteEntity(
    3,
    TipoComprobante.FACTURA,
    'F001',
    1,
    1000,
    250,
    100,
    estado,
    fecha,
    fecha,
  );

describe('ChangeSerieComprobanteStatusUseCase', () => {
  const repository = {
    findById: jest.fn(),
    existsActivaByTipo: jest.fn(),
    setStatus: jest.fn(),
  };
  const useCase = new ChangeSerieComprobanteStatusUseCase(
    repository as unknown as SerieComprobanteRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.existsActivaByTipo.mockResolvedValue(false);
  });

  it('responde 404 si la serie no existe', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute(3, false)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(repository.setStatus).not.toHaveBeenCalled();
  });

  it('desactiva sin tocar el correlativo', async () => {
    repository.findById.mockResolvedValue(serie(true));

    await useCase.execute(3, false);

    expect(repository.setStatus).toHaveBeenCalledWith(3, false);
    expect(repository.existsActivaByTipo).not.toHaveBeenCalled();
  });

  it('reactiva si no hay otra activa del tipo', async () => {
    repository.findById.mockResolvedValue(serie(false));

    await useCase.execute(3, true);

    expect(repository.existsActivaByTipo).toHaveBeenCalledWith(
      TipoComprobante.FACTURA,
      3,
    );
    expect(repository.setStatus).toHaveBeenCalledWith(3, true);
  });

  it('responde 409 al reactivar si ya hay otra activa del tipo', async () => {
    repository.findById.mockResolvedValue(serie(false));
    repository.existsActivaByTipo.mockResolvedValue(true);

    await expect(useCase.execute(3, true)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(repository.setStatus).not.toHaveBeenCalled();
  });
});
