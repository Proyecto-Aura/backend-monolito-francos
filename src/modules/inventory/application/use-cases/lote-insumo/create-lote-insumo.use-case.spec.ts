import { InsumoEntity } from '../../../domain/entities';
import { TipoInsumo, UnidadMedidaInsumo } from '../../../domain/enums';
import { ResourceConflictError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';
import { LoteInsumoRepository } from '../../../domain/repositories/lote-insumo.repository';
import { CreateLoteInsumoUseCase } from './create-lote-insumo.use-case';

describe('CreateLoteInsumoUseCase', () => {
  const findByIdInsumo = jest.fn();
  const insumoRepository = {
    findById: findByIdInsumo,
  } as unknown as jest.Mocked<InsumoRepository>;

  const existsByCodigoLote = jest.fn();
  const create = jest.fn();
  const loteInsumoRepository = {
    existsByCodigoLote,
    create,
  } as unknown as jest.Mocked<LoteInsumoRepository>;

  const useCase = new CreateLoteInsumoUseCase(
    loteInsumoRepository,
    insumoRepository,
  );

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const insumoActivo = new InsumoEntity(
    1,
    'FR-INS-001',
    'Harina de trigo',
    null,
    UnidadMedidaInsumo.KG,
    250,
    50,
    500,
    TipoInsumo.MATERIA_PRIMA,
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findByIdInsumo.mockResolvedValue(insumoActivo);
    existsByCodigoLote.mockResolvedValue(false);
    create.mockImplementation((params: object) => Promise.resolve(params));
  });

  it('crea el lote con cantidad_inicial y razon por defecto (cantidad_actual la define el movimiento de entrada)', async () => {
    await useCase.execute({
      insumo_id: 1,
      codigo_lote: 'LOTE-2026-001',
      fecha_ingreso: '2026-10-17',
      cantidad_inicial: 100,
    });

    expect(create).toHaveBeenCalledWith({
      insumo_id: 1,
      codigo_lote: 'LOTE-2026-001',
      fecha_ingreso: new Date('2026-10-17T00:00:00.000Z'),
      fecha_vencimiento: null,
      cantidad_inicial: 100,
      estado: 'activo',
      activo: true,
      razon: 'Ingreso inicial de lote',
    });
  });

  it('respeta la razon enviada en vez de la razon por defecto', async () => {
    await useCase.execute({
      insumo_id: 1,
      codigo_lote: 'LOTE-2026-006',
      fecha_ingreso: '2026-10-17',
      cantidad_inicial: 10,
      razon: 'Compra a proveedor X',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ razon: 'Compra a proveedor X' }),
    );
  });

  it('lanza 404 si el insumo no existe', async () => {
    findByIdInsumo.mockResolvedValue(null);

    await expect(
      useCase.execute({
        insumo_id: 99,
        codigo_lote: 'LOTE-2026-002',
        fecha_ingreso: '2026-10-17',
        cantidad_inicial: 10,
      }),
    ).rejects.toThrow('Insumo no encontrado');
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el insumo no está activo', async () => {
    findByIdInsumo.mockResolvedValue({ ...insumoActivo, estado: false });

    await expect(
      useCase.execute({
        insumo_id: 1,
        codigo_lote: 'LOTE-2026-003',
        fecha_ingreso: '2026-10-17',
        cantidad_inicial: 10,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el código de lote ya existe', async () => {
    existsByCodigoLote.mockResolvedValue(true);

    await expect(
      useCase.execute({
        insumo_id: 1,
        codigo_lote: 'LOTE-2026-001',
        fecha_ingreso: '2026-10-17',
        cantidad_inicial: 10,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si la fecha de vencimiento es anterior a la de ingreso', async () => {
    await expect(
      useCase.execute({
        insumo_id: 1,
        codigo_lote: 'LOTE-2026-004',
        fecha_ingreso: '2026-10-17',
        fecha_vencimiento: '2026-10-01',
        cantidad_inicial: 10,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(create).not.toHaveBeenCalled();
  });

  it('acepta una fecha de vencimiento válida', async () => {
    await useCase.execute({
      insumo_id: 1,
      codigo_lote: 'LOTE-2026-005',
      fecha_ingreso: '2026-10-17',
      fecha_vencimiento: '2027-04-17',
      cantidad_inicial: 10,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        fecha_vencimiento: new Date('2027-04-17T00:00:00.000Z'),
      }),
    );
  });
});
