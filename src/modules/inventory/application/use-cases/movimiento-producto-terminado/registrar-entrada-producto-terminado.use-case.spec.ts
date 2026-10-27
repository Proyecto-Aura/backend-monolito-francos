import { LoteProductoTerminadoEntity } from '../../../domain/entities';
import { EstadoLoteProductoTerminado } from '../../../domain/enums';
import { UnidadMedidaPresentacion } from '../../../../catalog/domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';
import { MovimientoProductoTerminadoRepository } from '../../../domain/repositories/movimiento-producto-terminado.repository';
import { RegistrarEntradaProductoTerminadoUseCase } from './registrar-entrada-producto-terminado.use-case';

describe('RegistrarEntradaProductoTerminadoUseCase', () => {
  const findByIdLote = jest.fn();
  const loteProductoTerminadoRepository = {
    findById: findByIdLote,
  } as unknown as jest.Mocked<LoteProductoTerminadoRepository>;

  const create = jest.fn();
  const createMany = jest.fn();
  const movimientoProductoTerminadoRepository = {
    create,
    createMany,
  } as unknown as jest.Mocked<MovimientoProductoTerminadoRepository>;

  const useCase = new RegistrarEntradaProductoTerminadoUseCase(
    movimientoProductoTerminadoRepository,
    loteProductoTerminadoRepository,
  );

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const loteActivo = new LoteProductoTerminadoEntity(
    4,
    1,
    'DEMO-MOV-PT-001',
    10,
    'Chifles clásicos',
    1,
    'Chifles',
    1,
    250,
    UnidadMedidaPresentacion.GR,
    'LOTE-DEMO-PT-004',
    fecha,
    null,
    60,
    60,
    EstadoLoteProductoTerminado.ACTIVO,
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findByIdLote.mockResolvedValue(loteActivo);
    create.mockImplementation((params: object) => Promise.resolve(params));
    createMany.mockImplementation((params: object[]) =>
      Promise.resolve(params),
    );
  });

  it('lanza 404 si el lote no existe', async () => {
    findByIdLote.mockResolvedValue(null);

    await expect(
      useCase.execute({
        lote_producto_terminado_id: 99,
        cantidad: 40,
        razon: 'Segunda hornada',
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el lote no está activo', async () => {
    findByIdLote.mockResolvedValue({ ...loteActivo, activo: false });

    await expect(
      useCase.execute({
        lote_producto_terminado_id: 4,
        cantidad: 40,
        razon: 'Segunda hornada',
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(create).not.toHaveBeenCalled();
  });

  it('crea un movimiento de entrada sobre el lote existente', async () => {
    await useCase.execute({
      lote_producto_terminado_id: 4,
      cantidad: 40,
      razon: 'Segunda hornada del mismo lote',
    });

    expect(create).toHaveBeenCalledWith({
      lote_producto_terminado_id: 4,
      tipo: 'entrada',
      cantidad: 40,
      razon: 'Segunda hornada del mismo lote',
    });
  });

  describe('executeMany', () => {
    it('crea varias entradas en una sola llamada a createMany', async () => {
      await useCase.executeMany([
        { lote_producto_terminado_id: 4, cantidad: 10, razon: 'Fila 1' },
        { lote_producto_terminado_id: 4, cantidad: 20, razon: 'Fila 2' },
      ]);

      expect(createMany).toHaveBeenCalledWith([
        {
          lote_producto_terminado_id: 4,
          tipo: 'entrada',
          cantidad: 10,
          razon: 'Fila 1',
        },
        {
          lote_producto_terminado_id: 4,
          tipo: 'entrada',
          cantidad: 20,
          razon: 'Fila 2',
        },
      ]);
    });

    it('no llama a createMany si una fila referencia un lote inexistente', async () => {
      findByIdLote
        .mockResolvedValueOnce(loteActivo)
        .mockResolvedValueOnce(null);

      await expect(
        useCase.executeMany([
          { lote_producto_terminado_id: 4, cantidad: 10, razon: 'Fila 1' },
          { lote_producto_terminado_id: 99, cantidad: 20, razon: 'Fila 2' },
        ]),
      ).rejects.toBeInstanceOf(ResourceNotFoundError);

      expect(createMany).not.toHaveBeenCalled();
    });
  });
});
