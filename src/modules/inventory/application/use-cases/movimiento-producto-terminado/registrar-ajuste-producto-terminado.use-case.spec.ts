import { LoteProductoTerminadoEntity } from '../../../domain/entities';
import { EstadoLoteProductoTerminado } from '../../../domain/enums';
import { UnidadMedidaPresentacion } from '../../../../catalog/domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';
import { MovimientoProductoTerminadoRepository } from '../../../domain/repositories/movimiento-producto-terminado.repository';
import { RegistrarAjusteProductoTerminadoUseCase } from './registrar-ajuste-producto-terminado.use-case';

describe('RegistrarAjusteProductoTerminadoUseCase', () => {
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

  const useCase = new RegistrarAjusteProductoTerminadoUseCase(
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

  it('lanza 409 si la cantidad es 0', async () => {
    await expect(
      useCase.execute({
        lote_producto_terminado_id: 4,
        cantidad: 0,
        razon: 'Conteo',
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 404 si el lote no existe', async () => {
    findByIdLote.mockResolvedValue(null);

    await expect(
      useCase.execute({
        lote_producto_terminado_id: 99,
        cantidad: -5,
        razon: 'Merma',
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el lote no está activo', async () => {
    findByIdLote.mockResolvedValue({ ...loteActivo, activo: false });

    await expect(
      useCase.execute({
        lote_producto_terminado_id: 4,
        cantidad: -5,
        razon: 'Merma',
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el ajuste dejaría el lote en negativo', async () => {
    await expect(
      useCase.execute({
        lote_producto_terminado_id: 4,
        cantidad: -100,
        razon: 'Merma',
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(create).not.toHaveBeenCalled();
  });

  it('crea un ajuste negativo (merma) dentro del rango disponible', async () => {
    await useCase.execute({
      lote_producto_terminado_id: 4,
      cantidad: -5,
      razon: 'Merma',
    });

    expect(create).toHaveBeenCalledWith({
      lote_producto_terminado_id: 4,
      tipo: 'ajuste',
      cantidad: -5,
      razon: 'Merma',
    });
  });

  it('crea un ajuste positivo (corrección hacia arriba)', async () => {
    await useCase.execute({
      lote_producto_terminado_id: 4,
      cantidad: 8,
      razon: 'Conteo físico halló más stock',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ajuste', cantidad: 8 }),
    );
  });

  describe('executeMany', () => {
    it('crea varios ajustes en una sola llamada a createMany', async () => {
      await useCase.executeMany([
        { lote_producto_terminado_id: 4, cantidad: -5, razon: 'Merma' },
        { lote_producto_terminado_id: 4, cantidad: 8, razon: 'Conteo físico' },
      ]);

      expect(createMany).toHaveBeenCalledWith([
        {
          lote_producto_terminado_id: 4,
          tipo: 'ajuste',
          cantidad: -5,
          razon: 'Merma',
        },
        {
          lote_producto_terminado_id: 4,
          tipo: 'ajuste',
          cantidad: 8,
          razon: 'Conteo físico',
        },
      ]);
    });

    it('no llama a createMany si una fila es inválida', async () => {
      await expect(
        useCase.executeMany([
          { lote_producto_terminado_id: 4, cantidad: -5, razon: 'Merma' },
          { lote_producto_terminado_id: 4, cantidad: 0, razon: 'Inválido' },
        ]),
      ).rejects.toBeInstanceOf(ResourceConflictError);

      expect(createMany).not.toHaveBeenCalled();
    });
  });
});
