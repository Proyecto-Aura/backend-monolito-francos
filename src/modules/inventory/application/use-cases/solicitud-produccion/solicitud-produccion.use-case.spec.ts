import { SolicitudProduccionEntity } from '../../../domain/entities';
import { EstadoSolicitudProduccion } from '../../../domain/enums';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { SolicitudProduccionDetalleRepository } from '../../../domain/repositories/solicitud-produccion-detalle.repository';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { CreateSolicitudProduccionUseCase } from './create-solicitud-produccion.use-case';
import { GetSolicitudProduccionByIdUseCase } from './get-solicitud-produccion-by-id.use-case';
import { ListSolicitudesProduccionUseCase } from './list-solicitudes-produccion.use-case';

describe('Crear y consultar solicitudes de producción', () => {
  const repository = {
    create: jest.fn<
      ReturnType<SolicitudProduccionRepository['create']>,
      Parameters<SolicitudProduccionRepository['create']>
    >(),
    existsByCodigo: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    updateEstado: jest.fn(),
    updateFechaLimite: jest.fn(),
    getIndicadores: jest.fn(),
  } satisfies jest.Mocked<SolicitudProduccionRepository>;
  const productos = {
    findById: jest.fn(),
  };
  const detalles = {
    findBySolicitudId: jest.fn(),
  };
  const fecha = new Date('2026-10-29T12:00:00Z');
  const solicitud = new SolicitudProduccionEntity(
    1,
    'FR-SPR-001-261029',
    EstadoSolicitudProduccion.PENDIENTE,
    fecha,
    null,
    'usuario-id',
    'Usuario Inventario Prueba',
    fecha,
    fecha,
  );
  const dto = {
    codigo: 'FR-SPR-001-261029',
    detalle: [
      { producto_terminado_id: 10, cantidad_solicitada: 50 },
      { producto_terminado_id: 20, cantidad_solicitada: 25 },
    ],
  };
  const crear = new CreateSolicitudProduccionUseCase(
    repository,
    productos as unknown as ProductoTerminadoRepository,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    repository.existsByCodigo.mockResolvedValue(false);
    repository.create.mockResolvedValue(solicitud);
    productos.findById.mockResolvedValue({ id: 10 });
  });

  it('crea cabecera y todas las líneas con el código del cliente y el solicitante autenticado', async () => {
    const inicio = Date.now();
    await expect(crear.execute(dto, 'usuario-id')).resolves.toBe(solicitud);
    expect(repository.existsByCodigo).toHaveBeenCalledWith(dto.codigo);
    expect(productos.findById.mock.calls).toEqual([[10], [20]]);
    expect(repository.create).toHaveBeenCalledWith({
      codigo: dto.codigo,
      fecha_creacion: expect.any(Date) as Date,
      fecha_limite: null,
      solicitado_por: 'usuario-id',
      detalle: dto.detalle,
    });
    const params = repository.create.mock.calls[0][0];
    expect(params.fecha_creacion.getTime()).toBeGreaterThanOrEqual(inicio);
    expect(params.fecha_creacion.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('convierte la fecha límite y recorta los espacios del código', async () => {
    await crear.execute(
      { ...dto, codigo: ` ${dto.codigo} `, fecha_limite: '2026-11-15' },
      'usuario-id',
    );
    expect(repository.existsByCodigo).toHaveBeenCalledWith(dto.codigo);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: dto.codigo,
        fecha_limite: new Date('2026-11-15'),
      }),
    );
  });

  it('rechaza un código duplicado sin crear ni consultar productos', async () => {
    repository.existsByCodigo.mockResolvedValue(true);
    await expect(crear.execute(dto, 'usuario-id')).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(productos.findById).not.toHaveBeenCalled();
  });

  it('rechaza productos repetidos sin persistir una solicitud parcial', async () => {
    await expect(
      crear.execute(
        { ...dto, detalle: [dto.detalle[0], dto.detalle[0]] },
        'usuario-id',
      ),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rechaza una línea con producto inexistente sin persistir la cabecera', async () => {
    productos.findById
      .mockResolvedValueOnce({ id: 10 })
      .mockResolvedValueOnce(null);
    await expect(crear.execute(dto, 'usuario-id')).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('obtiene cabecera y detalle de la misma solicitud', async () => {
    repository.findById.mockResolvedValue(solicitud);
    detalles.findBySolicitudId.mockResolvedValue([]);
    const consultar = new GetSolicitudProduccionByIdUseCase(
      repository,
      detalles as unknown as SolicitudProduccionDetalleRepository,
    );
    await expect(consultar.execute(1)).resolves.toEqual({
      solicitud,
      detalle: [],
    });
    expect(repository.findById).toHaveBeenCalledWith(1);
    expect(detalles.findBySolicitudId).toHaveBeenCalledWith(1);
  });

  it('devuelve 404 sin consultar líneas cuando no existe la solicitud', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      new GetSolicitudProduccionByIdUseCase(
        repository,
        detalles as unknown as SolicitudProduccionDetalleRepository,
      ).execute(99),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(detalles.findBySolicitudId).not.toHaveBeenCalled();
  });

  it('propaga filtros y convierte las fechas al listar', async () => {
    const resultado = { data: [solicitud], total: 1, page: 2, limit: 5 };
    repository.findMany.mockResolvedValue(resultado);
    const query = {
      page: 2,
      limit: 5,
      search: 'SPR',
      estado: EstadoSolicitudProduccion.PENDIENTE,
      fecha_desde: '2026-10-01',
      fecha_hasta: '2026-10-31',
    };
    await expect(
      new ListSolicitudesProduccionUseCase(repository).execute(query),
    ).resolves.toBe(resultado);
    expect(repository.findMany).toHaveBeenCalledWith({
      ...query,
      fecha_desde: new Date(query.fecha_desde),
      fecha_hasta: new Date(query.fecha_hasta),
    });
  });

  it('permite listar sin filtros opcionales', async () => {
    repository.findMany.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    await new ListSolicitudesProduccionUseCase(repository).execute({
      page: 1,
      limit: 10,
    });
    expect(repository.findMany).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: undefined,
      estado: undefined,
      fecha_desde: undefined,
      fecha_hasta: undefined,
    });
  });
});
