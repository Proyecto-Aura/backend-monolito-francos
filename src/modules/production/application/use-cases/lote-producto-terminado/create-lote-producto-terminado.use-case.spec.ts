import { ProductoTerminadoEntity } from '../../../../inventory/domain/entities';
import { UnidadMedidaPresentacion } from '../../../../catalog/domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';
import { ProductoTerminadoRepository } from '../../../../inventory/domain/repositories/producto-terminado.repository';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { CreateLoteProductoTerminadoUseCase } from './create-lote-producto-terminado.use-case';

describe('CreateLoteProductoTerminadoUseCase', () => {
  const findById = jest.fn();
  const existsByCodigoLote = jest.fn();
  const create = jest.fn();
  const productos = { findById } as unknown as ProductoTerminadoRepository;
  const lotes = {
    existsByCodigoLote,
    create,
  } as unknown as LoteProductoTerminadoRepository;
  const findSolicitudById = jest.fn();
  const solicitudes = {
    findById: findSolicitudById,
  } as unknown as SolicitudProduccionRepository;
  const useCase = new CreateLoteProductoTerminadoUseCase(
    lotes,
    productos,
    solicitudes,
  );
  const fecha = new Date('2026-11-01T00:00:00Z');
  const producto = new ProductoTerminadoEntity(
    17,
    23,
    'SKU-263',
    1,
    'Chifles',
    2,
    'Snacks',
    3,
    250,
    UnidadMedidaPresentacion.GR,
    true,
    20,
    5,
    null,
    fecha,
    fecha,
  );
  const dto = {
    producto_terminado_id: 17,
    codigo_lote: 'FR-LT-PT-001',
    fecha_produccion: '2026-11-01',
    cantidad_inicial: 100,
  };
  const creado = { id: 7 };

  beforeEach(() => {
    jest.resetAllMocks();
    findById.mockResolvedValue(producto);
    existsByCodigoLote.mockResolvedValue(false);
    create.mockResolvedValue(creado);
  });

  it('crea con valores por defecto y deja cantidad_actual a cargo de la entrada', async () => {
    await expect(useCase.execute(dto)).resolves.toBe(creado);
    expect(findById).toHaveBeenCalledWith(17);
    expect(existsByCodigoLote).toHaveBeenCalledWith(dto.codigo_lote);
    expect(create).toHaveBeenCalledWith({
      producto_terminado_id: 17,
      codigo_lote: dto.codigo_lote,
      fecha_produccion: fecha,
      fecha_vencimiento: null,
      cantidad_inicial: 100,
      estado: 'activo',
      activo: true,
      razon: 'Producción inicial de lote',
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(findSolicitudById).not.toHaveBeenCalled();
  });

  it('valida la solicitud indicada y persiste su vínculo en el lote', async () => {
    findSolicitudById.mockResolvedValue({ id: 31 });
    await expect(
      useCase.execute({ ...dto, solicitud_produccion_id: 31 }),
    ).resolves.toBe(creado);
    expect(findSolicitudById).toHaveBeenCalledWith(31);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ solicitud_produccion_id: 31 }),
    );
  });

  it('devuelve 404 sin crear el lote si la solicitud no existe', async () => {
    findSolicitudById.mockResolvedValue(null);
    await expect(
      useCase.execute({ ...dto, solicitud_produccion_id: 99 }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(create).not.toHaveBeenCalled();
  });

  it('normaliza el código antes de comprobar duplicados y persistir', async () => {
    await useCase.execute({ ...dto, codigo_lote: '  FR-LT   PT-001  ' });
    expect(existsByCodigoLote).toHaveBeenCalledWith('FR-LT PT-001');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ codigo_lote: 'FR-LT PT-001' }),
    );
  });

  it('respeta razón, activo=false y una cantidad decimal', async () => {
    await useCase.execute({
      ...dto,
      razon: 'Producción manual',
      activo: false,
      cantidad_inicial: 12.5,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        razon: 'Producción manual',
        activo: false,
        cantidad_inicial: 12.5,
      }),
    );
  });

  it.each(['2026-11-01', '2027-05-01'])(
    'acepta vencimiento %s igual o posterior a producción',
    async (fecha_vencimiento) => {
      await useCase.execute({ ...dto, fecha_vencimiento });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha_vencimiento: new Date(`${fecha_vencimiento}T00:00:00.000Z`),
        }),
      );
    },
  );

  it('devuelve 404 sin crear cuando el producto terminado no existe', async () => {
    findById.mockResolvedValue(null);
    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(existsByCodigoLote).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('devuelve 409 sin crear cuando el producto está inactivo', async () => {
    findById.mockResolvedValue({ ...producto, estado: false });
    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('devuelve 409 sin crear cuando el código ya existe', async () => {
    existsByCodigoLote.mockResolvedValue(true);
    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('devuelve 409 sin crear cuando vencimiento es anterior a producción', async () => {
    await expect(
      useCase.execute({ ...dto, fecha_vencimiento: '2026-10-31' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(create).not.toHaveBeenCalled();
  });

  it('propaga un fallo de persistencia sin reintentar la entrada', async () => {
    const error = new Error('Fallo de transacción');
    create.mockRejectedValue(error);
    await expect(useCase.execute(dto)).rejects.toBe(error);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
