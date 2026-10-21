import { InsumoEntity } from '../../../domain/entities';
import { TipoInsumo, UnidadMedidaInsumo } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';
import { UpdateInsumoUseCase } from './update-insumo.use-case';

describe('UpdateInsumoUseCase', () => {
  const findById = jest.fn();
  const update = jest.fn();
  const insumoRepository = {
    findById,
    update,
  } as unknown as jest.Mocked<InsumoRepository>;
  const useCase = new UpdateInsumoUseCase(insumoRepository);

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const insumo = new InsumoEntity(
    1,
    'FR-INS-001',
    'Harina de trigo',
    null,
    UnidadMedidaInsumo.KG,
    20,
    10,
    500,
    TipoInsumo.MATERIA_PRIMA,
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findById.mockResolvedValue(insumo);
    update.mockImplementation((_id: number, params: object) =>
      Promise.resolve(params),
    );
  });

  it('lanza 404 si el insumo no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(1, { nombre: 'X' })).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('actualiza nombre normalizado y stock_minimo (stock_actual no es editable)', async () => {
    await useCase.execute(1, {
      nombre: '  Harina   integral ',
      stock_minimo: 15,
    });

    expect(update).toHaveBeenCalledWith(1, {
      nombre: 'Harina integral',
      descripcion: undefined,
      unidad_medida: undefined,
      stock_minimo: 15,
      stock_maximo: undefined,
      tipo: undefined,
    });
  });

  it('actualiza solo el tipo sin tocar el resto', async () => {
    await useCase.execute(1, { tipo: TipoInsumo.EMPAQUE });

    expect(update).toHaveBeenCalledWith(1, {
      nombre: undefined,
      descripcion: undefined,
      unidad_medida: undefined,
      stock_actual: undefined,
      stock_minimo: undefined,
      stock_maximo: undefined,
      tipo: TipoInsumo.EMPAQUE,
    });
  });

  it('normaliza la descripción enviada', async () => {
    await useCase.execute(1, { descripcion: '  Harina   integral 000 ' });

    expect(update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ descripcion: 'Harina integral 000' }),
    );
  });

  it('valida el stock_maximo contra el stock_minimo que ya tiene el insumo', async () => {
    await expect(
      useCase.execute(1, { stock_maximo: 5 }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it('valida el stock_maximo contra el stock_minimo nuevo cuando ambos cambian', async () => {
    await expect(
      useCase.execute(1, { stock_minimo: 50, stock_maximo: 40 }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(update).not.toHaveBeenCalled();
  });
});
