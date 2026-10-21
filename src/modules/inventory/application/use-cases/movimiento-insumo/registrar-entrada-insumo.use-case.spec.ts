import { LoteInsumoEntity } from '../../../domain/entities';
import { EstadoLoteInsumo } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteInsumoRepository } from '../../../domain/repositories/lote-insumo.repository';
import { MovimientoInsumoRepository } from '../../../domain/repositories/movimiento-insumo.repository';
import { RegistrarEntradaInsumoUseCase } from './registrar-entrada-insumo.use-case';

describe('RegistrarEntradaInsumoUseCase', () => {
  const findByIdLote = jest.fn();
  const loteInsumoRepository = {
    findById: findByIdLote,
  } as unknown as jest.Mocked<LoteInsumoRepository>;

  const create = jest.fn();
  const movimientoInsumoRepository = {
    create,
  } as unknown as jest.Mocked<MovimientoInsumoRepository>;

  const useCase = new RegistrarEntradaInsumoUseCase(
    movimientoInsumoRepository,
    loteInsumoRepository,
  );

  const fecha = new Date('2026-10-17T00:00:00.000Z');
  const loteActivo = new LoteInsumoEntity(
    4,
    1,
    'LOTE-2026-004',
    fecha,
    null,
    60,
    60,
    EstadoLoteInsumo.ACTIVO,
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findByIdLote.mockResolvedValue(loteActivo);
    create.mockImplementation((params: object) => Promise.resolve(params));
  });

  it('lanza 404 si el lote no existe', async () => {
    findByIdLote.mockResolvedValue(null);

    await expect(
      useCase.execute({
        lote_insumo_id: 99,
        cantidad: 40,
        razon: 'Segunda entrega',
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el lote no está activo', async () => {
    findByIdLote.mockResolvedValue({ ...loteActivo, activo: false });

    await expect(
      useCase.execute({
        lote_insumo_id: 4,
        cantidad: 40,
        razon: 'Segunda entrega',
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(create).not.toHaveBeenCalled();
  });

  it('crea un movimiento de entrada sobre el lote existente', async () => {
    await useCase.execute({
      lote_insumo_id: 4,
      cantidad: 40,
      razon: 'Segunda entrega del mismo lote',
    });

    expect(create).toHaveBeenCalledWith({
      lote_insumo_id: 4,
      tipo: 'entrada',
      cantidad: 40,
      razon: 'Segunda entrega del mismo lote',
    });
  });
});
