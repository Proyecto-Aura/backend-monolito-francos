import {
  SolicitudInsumosDetalleEntity,
  SolicitudInsumosEntity,
} from '../../../domain/entities';
import { EstadoSolicitudInsumos as Estado } from '../../../domain/enums';
import { UnidadMedidaInsumo } from '../../../../inventory/domain/enums';
import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';
import { SolicitudInsumosDetalleRepository } from '../../../domain/repositories/solicitud-insumos-detalle.repository';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { InsumoRepository } from '../../../../inventory/domain/repositories/insumo.repository';
import {
  ResourceConflictError,
  ResourceNotFoundError,
  InvalidRequestError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { CreateSolicitudInsumosUseCase } from './create-solicitud-insumos.use-case';
import { GetSolicitudInsumosByIdUseCase } from './get-solicitud-insumos-by-id.use-case';
import { ListSolicitudesInsumosUseCase } from './list-solicitudes-insumos.use-case';

describe('Crear y consultar solicitudes de insumos', () => {
  const repo = {
    create: jest.fn<
      ReturnType<SolicitudInsumosRepository['create']>,
      Parameters<SolicitudInsumosRepository['create']>
    >(),
    existsByCodigo: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    updateEstado: jest.fn(),
    updateFechaLimite: jest.fn(),
    getIndicadores: jest.fn(),
  } satisfies jest.Mocked<SolicitudInsumosRepository>;
  const insumos = { findById: jest.fn() };
  const produccion = { findById: jest.fn() };
  const detalles = { findBySolicitudId: jest.fn() };
  const crear = new CreateSolicitudInsumosUseCase(
    repo,
    insumos as unknown as InsumoRepository,
    produccion as unknown as SolicitudProduccionRepository,
  );
  const obtener = new GetSolicitudInsumosByIdUseCase(
    repo,
    detalles as unknown as SolicitudInsumosDetalleRepository,
  );
  const listar = new ListSolicitudesInsumosUseCase(repo);
  const fecha = new Date('2026-11-04T12:00:00Z');
  const solicitud = new SolicitudInsumosEntity(
    7,
    'SIN-007',
    null,
    Estado.PENDIENTE,
    fecha,
    null,
    'user-id',
    'Usuario Producción',
    fecha,
    fecha,
  );
  const dto = {
    codigo_solicitud: 'SIN-007',
    detalle: [
      { insumo_id: 10, cantidad_solicitada: 10.25 },
      { insumo_id: 20, cantidad_solicitada: 25 },
    ],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    repo.existsByCodigo.mockResolvedValue(false);
    repo.create.mockResolvedValue(solicitud);
    insumos.findById.mockResolvedValue({ id: 10 });
  });

  afterEach(() => jest.useRealTimers());

  it.each([
    ['2026-11-04T23:59:59.999Z', '2026-11-04T05:00:00Z'],
    ['2026-11-05T00:00:00Z', '2026-11-04T05:00:00Z'],
    ['2026-11-05T04:59:59.999Z', '2026-11-04T05:00:00Z'],
    ['2026-11-05T05:00:00Z', '2026-11-05T05:00:00Z'],
    ['2027-01-01T02:00:00Z', '2026-12-31T05:00:00Z'],
  ])(
    'crea con el calendario Lima: reloj UTC %s -> %s',
    async (ahora, esperado) => {
      jest.useFakeTimers().setSystemTime(new Date(ahora));
      await crear.execute(dto, 'usuario-id');
      expect(repo.create.mock.calls[0][0].fecha_creacion).toEqual(
        new Date(esperado),
      );
    },
  );

  it('crea cabecera y líneas sin vínculo opcional y con el solicitante autenticado', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-05T02:00:00Z'));
    await expect(crear.execute(dto, 'user-id')).resolves.toBe(solicitud);
    expect(repo.create).toHaveBeenCalledWith({
      codigo_solicitud: dto.codigo_solicitud,
      solicitud_produccion_id: null,
      fecha_creacion: expect.any(Date) as Date,
      fecha_limite: null,
      solicitado_por: 'user-id',
      detalle: dto.detalle,
    });
    expect(insumos.findById.mock.calls).toEqual([[10], [20]]);
    expect(produccion.findById).not.toHaveBeenCalled();
    expect(repo.create.mock.calls[0][0].fecha_creacion).toEqual(
      new Date('2026-11-04T05:00:00Z'),
    );
  });

  it('normaliza el código una vez y valida/persiste el vínculo a producción y la fecha límite', async () => {
    produccion.findById.mockResolvedValue({ id: 31 });
    await crear.execute(
      {
        ...dto,
        codigo_solicitud: ' SIN-007 ',
        solicitud_produccion_id: 31,
        fecha_limite: '2026-11-15',
      },
      'user-id',
    );
    expect(repo.existsByCodigo).toHaveBeenCalledWith('SIN-007');
    expect(produccion.findById).toHaveBeenCalledWith(31);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo_solicitud: 'SIN-007',
        solicitud_produccion_id: 31,
        fecha_limite: new Date('2026-11-15'),
      }),
    );
  });

  it('rechaza código duplicado antes de consultar insumos o crear', async () => {
    repo.existsByCodigo.mockResolvedValue(true);
    await expect(crear.execute(dto, 'user-id')).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(repo.create).not.toHaveBeenCalled();
    expect(insumos.findById).not.toHaveBeenCalled();
  });

  it('devuelve 404 para una solicitud de producción inexistente sin efectos parciales', async () => {
    produccion.findById.mockResolvedValue(null);
    await expect(
      crear.execute({ ...dto, solicitud_produccion_id: 99 }, 'user-id'),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(repo.create).not.toHaveBeenCalled();
    expect(insumos.findById).not.toHaveBeenCalled();
  });

  it('rechaza insumo repetido sin persistir la solicitud', async () => {
    await expect(
      crear.execute(
        { ...dto, detalle: [dto.detalle[0], dto.detalle[0]] },
        'user-id',
      ),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rechaza el segundo insumo inexistente sin crear cabecera ni detalle parcial', async () => {
    insumos.findById
      .mockResolvedValueOnce({ id: 10 })
      .mockResolvedValueOnce(null);
    await expect(crear.execute(dto, 'user-id')).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('obtiene cabecera y líneas de la solicitud sin agregar updated_at al detalle', async () => {
    const linea = new SolicitudInsumosDetalleEntity(
      1,
      7,
      10,
      'INS-10',
      'Harina',
      UnidadMedidaInsumo.KG,
      10.25,
      fecha,
    );
    repo.findById.mockResolvedValue(solicitud);
    detalles.findBySolicitudId.mockResolvedValue([linea]);
    await expect(obtener.execute(7)).resolves.toEqual({
      solicitud,
      detalle: [linea],
    });
    expect(detalles.findBySolicitudId).toHaveBeenCalledWith(7);
    expect(linea).not.toHaveProperty('updated_at');
  });

  it('devuelve 404 sin buscar líneas si no existe la solicitud', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(obtener.execute(99)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(detalles.findBySolicitudId).not.toHaveBeenCalled();
  });

  it('propaga paginación, estado, búsqueda y vínculo con rango inclusivo/exclusivo de Lima', async () => {
    const resultado = { data: [solicitud], total: 1, page: 2, limit: 5 };
    repo.findMany.mockResolvedValue(resultado);
    const query = {
      page: 2,
      limit: 5,
      search: 'Harina',
      estado: Estado.EN_PROCESO,
      solicitud_produccion_id: 31,
      fecha_desde: '2026-11-01',
      fecha_hasta: '2026-11-04',
    };
    await expect(listar.execute(query)).resolves.toBe(resultado);
    expect(repo.findMany).toHaveBeenCalledWith({
      ...query,
      fecha_desde: new Date('2026-11-01T00:00:00-05:00'),
      fecha_hasta: new Date('2026-11-05T00:00:00-05:00'),
    });
  });

  it('permite listar sin filtros opcionales', async () => {
    await listar.execute({ page: 1, limit: 10 });
    expect(repo.findMany).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      estado: undefined,
      search: undefined,
      solicitud_produccion_id: undefined,
      fecha_desde: undefined,
      fecha_hasta: undefined,
    });
  });

  it.each([
    {
      fecha_desde: '2026-11-04',
      fecha_desdeEsperada: new Date('2026-11-04T00:00:00-05:00'),
    },
    {
      fecha_hasta: '2026-11-04',
      fecha_hastaEsperada: new Date('2026-11-05T00:00:00-05:00'),
    },
  ])('permite un solo extremo del rango: %j', async (caso) => {
    await listar.execute({
      page: 1,
      limit: 10,
      fecha_desde: caso.fecha_desde,
      fecha_hasta: caso.fecha_hasta,
    });
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        fecha_desde: caso.fecha_desdeEsperada,
        fecha_hasta: caso.fecha_hastaEsperada,
      }),
    );
  });

  it('rechaza desde posterior a hasta sin consultar el repositorio', async () => {
    await expect(
      listar.execute({
        page: 1,
        limit: 10,
        fecha_desde: '2026-11-05',
        fecha_hasta: '2026-11-04',
      }),
    ).rejects.toBeInstanceOf(InvalidRequestError);
    expect(repo.findMany).not.toHaveBeenCalled();
  });
});
