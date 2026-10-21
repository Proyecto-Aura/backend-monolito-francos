import { InsumoEntity, LoteInsumoEntity } from '../../../domain/entities';
import {
  EstadoLoteInsumo,
  TipoInsumo,
  UnidadMedidaInsumo,
} from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';
import { LoteInsumoRepository } from '../../../domain/repositories/lote-insumo.repository';
import { MovimientoInsumoRepository } from '../../../domain/repositories/movimiento-insumo.repository';
import { RegistrarSalidaInsumoUseCase } from './registrar-salida-insumo.use-case';

describe('RegistrarSalidaInsumoUseCase', () => {
  const findByIdInsumo = jest.fn();
  const insumoRepository = {
    findById: findByIdInsumo,
  } as unknown as jest.Mocked<InsumoRepository>;

  const findDisponiblesParaSalida = jest.fn();
  const loteInsumoRepository = {
    findDisponiblesParaSalida,
  } as unknown as jest.Mocked<LoteInsumoRepository>;

  const createMany = jest.fn();
  const movimientoInsumoRepository = {
    createMany,
  } as unknown as jest.Mocked<MovimientoInsumoRepository>;

  const useCase = new RegistrarSalidaInsumoUseCase(
    movimientoInsumoRepository,
    loteInsumoRepository,
    insumoRepository,
  );

  const fecha = new Date('2026-10-17T00:00:00.000Z');
  const insumoActivo = new InsumoEntity(
    1,
    'FR-INS-001',
    'Harina de trigo',
    null,
    UnidadMedidaInsumo.KG,
    160,
    50,
    500,
    TipoInsumo.MATERIA_PRIMA,
    true,
    fecha,
    fecha,
  );

  const loteA = new LoteInsumoEntity(
    10,
    1,
    'LOTE-A',
    fecha,
    new Date('2026-10-20T00:00:00.000Z'),
    60,
    60,
    EstadoLoteInsumo.ACTIVO,
    true,
    fecha,
    fecha,
  );
  const loteB = new LoteInsumoEntity(
    11,
    1,
    'LOTE-B',
    fecha,
    new Date('2026-11-06T00:00:00.000Z'),
    100,
    100,
    EstadoLoteInsumo.ACTIVO,
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findByIdInsumo.mockResolvedValue(insumoActivo);
    findDisponiblesParaSalida.mockResolvedValue([loteA, loteB]);
    createMany.mockImplementation((params: object[]) =>
      Promise.resolve(params),
    );
  });

  it('lanza 404 si el insumo no existe', async () => {
    findByIdInsumo.mockResolvedValue(null);

    await expect(
      useCase.execute({ insumo_id: 99, cantidad: 10, razon: 'Consumo' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('lanza 409 si el insumo no está activo', async () => {
    findByIdInsumo.mockResolvedValue({ ...insumoActivo, estado: false });

    await expect(
      useCase.execute({ insumo_id: 1, cantidad: 10, razon: 'Consumo' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('lanza 409 si el stock disponible no alcanza', async () => {
    await expect(
      useCase.execute({ insumo_id: 1, cantidad: 999, razon: 'Consumo' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('toma todo de un solo lote cuando alcanza', async () => {
    await useCase.execute({ insumo_id: 1, cantidad: 30, razon: 'Consumo' });

    expect(createMany).toHaveBeenCalledWith([
      { lote_insumo_id: 10, tipo: 'salida', cantidad: 30, razon: 'Consumo' },
    ]);
  });

  it('reparte FEFO entre varios lotes cuando el primero no alcanza', async () => {
    await useCase.execute({ insumo_id: 1, cantidad: 150, razon: 'Consumo' });

    expect(createMany).toHaveBeenCalledWith([
      { lote_insumo_id: 10, tipo: 'salida', cantidad: 60, razon: 'Consumo' },
      { lote_insumo_id: 11, tipo: 'salida', cantidad: 90, razon: 'Consumo' },
    ]);
  });
});
