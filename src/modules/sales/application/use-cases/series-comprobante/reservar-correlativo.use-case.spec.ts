import { SerieComprobanteEntity } from '../../../domain/entities/serie-comprobante.entity';
import { TipoComprobante } from '../../../domain/enums/sales.enums';
import { CorrelativoNoDisponibleError } from '../../../domain/errors/sales-domain.errors';
import { SerieComprobanteRepository } from '../../../domain/repositories/serie-comprobante.repository';
import { ReservarCorrelativoUseCase } from './reservar-correlativo.use-case';

const fecha = new Date('2026-01-01T00:00:00.000Z');
const activa = (actual: number) =>
  new SerieComprobanteEntity(
    1,
    TipoComprobante.BOLETA,
    'B001',
    1,
    10,
    actual,
    100,
    true,
    fecha,
    fecha,
  );

describe('ReservarCorrelativoUseCase', () => {
  const repository = {
    reservarSiguiente: jest.fn(),
    findActivaByTipo: jest.fn(),
    existsByTipo: jest.fn(),
  };
  const useCase = new ReservarCorrelativoUseCase(
    repository as unknown as SerieComprobanteRepository,
  );

  const motivoDe = async (tipo: TipoComprobante) => {
    const error = (await useCase
      .execute(tipo)
      .catch((e: unknown) => e)) as CorrelativoNoDisponibleError;
    expect(error).toBeInstanceOf(CorrelativoNoDisponibleError);
    expect(error.statusCode).toBe(409);
    return error.motivo;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve el número reservado por el repositorio', async () => {
    repository.reservarSiguiente.mockResolvedValue({
      serie_id: 1,
      serie: 'B001',
      numero: 1,
    });

    await expect(useCase.execute(TipoComprobante.BOLETA)).resolves.toEqual({
      serie_id: 1,
      serie: 'B001',
      numero: 1,
    });
    expect(repository.reservarSiguiente).toHaveBeenCalledWith(
      TipoComprobante.BOLETA,
    );
    expect(repository.findActivaByTipo).not.toHaveBeenCalled();
  });

  it('sin ninguna serie del tipo: sin_serie_activa', async () => {
    repository.reservarSiguiente.mockResolvedValue(null);
    repository.findActivaByTipo.mockResolvedValue(null);
    repository.existsByTipo.mockResolvedValue(false);

    await expect(motivoDe(TipoComprobante.FACTURA)).resolves.toBe(
      'sin_serie_activa',
    );
  });

  it('solo series inactivas del tipo: serie_inactiva', async () => {
    repository.reservarSiguiente.mockResolvedValue(null);
    repository.findActivaByTipo.mockResolvedValue(null);
    repository.existsByTipo.mockResolvedValue(true);

    await expect(motivoDe(TipoComprobante.BOLETA)).resolves.toBe(
      'serie_inactiva',
    );
  });

  it('la activa llegó al fin de su rango: serie_agotada', async () => {
    repository.reservarSiguiente.mockResolvedValue(null);
    repository.findActivaByTipo.mockResolvedValue(activa(10));

    await expect(motivoDe(TipoComprobante.BOLETA)).resolves.toBe(
      'serie_agotada',
    );
    expect(repository.reservarSiguiente).toHaveBeenCalledTimes(1);
  });

  it('reintenta una vez si la serie se activó o amplió en medio', async () => {
    repository.reservarSiguiente
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ serie_id: 1, serie: 'B001', numero: 6 });
    repository.findActivaByTipo.mockResolvedValue(activa(5));

    await expect(useCase.execute(TipoComprobante.BOLETA)).resolves.toEqual({
      serie_id: 1,
      serie: 'B001',
      numero: 6,
    });
    expect(repository.reservarSiguiente).toHaveBeenCalledTimes(2);
  });
});
