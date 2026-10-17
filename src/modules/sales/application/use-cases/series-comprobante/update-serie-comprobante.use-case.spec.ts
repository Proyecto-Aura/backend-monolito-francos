import { SerieComprobanteEntity } from '../../../domain/entities/serie-comprobante.entity';
import { TipoComprobante } from '../../../domain/enums/sales.enums';
import {
  InvalidSerieComprobanteError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { SerieComprobanteRepository } from '../../../domain/repositories/serie-comprobante.repository';
import { UpdateSerieComprobanteUseCase } from './update-serie-comprobante.use-case';

const fecha = new Date('2026-01-01T00:00:00.000Z');
const serie = (actual: number, estado = true) =>
  new SerieComprobanteEntity(
    7,
    TipoComprobante.BOLETA,
    'B001',
    1,
    1000,
    actual,
    100,
    estado,
    fecha,
    fecha,
  );

describe('UpdateSerieComprobanteUseCase', () => {
  const repository = {
    findById: jest.fn(),
    existsBySerie: jest.fn(),
    existsActivaByTipo: jest.fn(),
    update: jest.fn(),
  };
  const useCase = new UpdateSerieComprobanteUseCase(
    repository as unknown as SerieComprobanteRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.existsBySerie.mockResolvedValue(false);
    repository.existsActivaByTipo.mockResolvedValue(false);
  });

  it('responde 404 si la serie no existe', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(7, { umbral_alerta: 5 }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  describe('sin emitir', () => {
    beforeEach(() => repository.findById.mockResolvedValue(serie(0)));

    it('permite cambiarlo todo y reubica el correlativo en inicio - 1', async () => {
      await useCase.execute(7, {
        tipo: TipoComprobante.FACTURA,
        serie: 'F001',
        correlativo_inicio: 101,
        correlativo_fin: 200,
      });

      expect(repository.existsBySerie).toHaveBeenCalledWith('F001', 7);
      expect(repository.existsActivaByTipo).toHaveBeenCalledWith(
        TipoComprobante.FACTURA,
        7,
      );
      expect(repository.update).toHaveBeenCalledWith(
        7,
        {
          tipo: TipoComprobante.FACTURA,
          serie: 'F001',
          correlativo_inicio: 101,
          correlativo_fin: 200,
          umbral_alerta: undefined,
          correlativo_actual: 100,
        },
        0,
      );
    });

    it('valida el prefijo contra el tipo resultante (400)', async () => {
      await expect(
        useCase.execute(7, { tipo: TipoComprobante.FACTURA }),
      ).rejects.toBeInstanceOf(InvalidSerieComprobanteError);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('valida el rango resultante (400)', async () => {
      await expect(
        useCase.execute(7, { correlativo_inicio: 2000 }),
      ).rejects.toBeInstanceOf(InvalidSerieComprobanteError);
    });

    it('responde 409 si el código nuevo ya existe', async () => {
      repository.existsBySerie.mockResolvedValue(true);

      await expect(
        useCase.execute(7, { serie: 'B002' }),
      ).rejects.toBeInstanceOf(ResourceConflictError);
    });

    it('responde 409 si al cambiar de tipo ya hay una activa de ese tipo', async () => {
      repository.existsActivaByTipo.mockResolvedValue(true);

      await expect(
        useCase.execute(7, { tipo: TipoComprobante.FACTURA, serie: 'F001' }),
      ).rejects.toBeInstanceOf(ResourceConflictError);
    });
  });

  describe('con números emitidos', () => {
    beforeEach(() => repository.findById.mockResolvedValue(serie(400)));

    it('permite ampliar el fin y cambiar el umbral, sin condición optimista', async () => {
      await useCase.execute(7, { correlativo_fin: 5000, umbral_alerta: 50 });

      expect(repository.update).toHaveBeenCalledWith(7, {
        correlativo_fin: 5000,
        umbral_alerta: 50,
      });
    });

    it('acepta reenviar los valores fijos sin cambios', async () => {
      await useCase.execute(7, {
        tipo: TipoComprobante.BOLETA,
        serie: 'B001',
        correlativo_inicio: 1,
        umbral_alerta: 10,
      });

      expect(repository.update).toHaveBeenCalled();
    });

    it.each([
      [{ serie: 'B002' }],
      [{ correlativo_inicio: 2 }],
      [{ tipo: TipoComprobante.FACTURA }],
    ])('responde 409 al cambiar %o', async (dto) => {
      await expect(useCase.execute(7, dto)).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('responde 409 al reducir el fin, aunque quede sobre el actual', async () => {
      await expect(
        useCase.execute(7, { correlativo_fin: 999 }),
      ).rejects.toThrow(
        new ResourceConflictError(
          'La serie ya emitió comprobantes: correlativo_fin solo se puede ampliar',
        ),
      );
    });

    it('responde 409 al dejar el fin por debajo del último emitido', async () => {
      await expect(
        useCase.execute(7, { correlativo_fin: 399 }),
      ).rejects.toThrow(
        new ResourceConflictError(
          'correlativo_fin no puede quedar por debajo del último número emitido (400)',
        ),
      );
    });
  });
});
