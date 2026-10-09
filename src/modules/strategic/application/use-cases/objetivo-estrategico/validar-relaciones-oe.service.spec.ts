import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { ValidarRelacionesOeService } from './validar-relaciones-oe.service';

describe('ValidarRelacionesOeService', () => {
  const findById = jest.fn();
  const existeRelacionInversa = jest.fn();
  const findRelacionesActivasPorPlanYTipo = jest.fn();
  const objetivoEstrategicoRepository = {
    findById,
    existeRelacionInversa,
    findRelacionesActivasPorPlanYTipo,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;

  const service = new ValidarRelacionesOeService(objetivoEstrategicoRepository);

  const destino = {
    id: 20,
    codigo: 'PE-0001-OE-N-002',
    plan_estrategico_id: 1,
    perspectiva_bsc_id: 1,
    tipo_modulo_id: 7,
    oe_negocio_id: null,
    estado_objetivo_id: 1,
    responsable: 'Ana Torres',
    nombre: 'Reducir costos operativos',
    descripcion: null,
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    perspectiva_bsc: {
      id: 1,
      nombre: 'Financiera',
      descripcion: null,
      orden: 1,
      estado: true,
    },
    estado_objetivo: {
      id: 1,
      codigo: 'PENDIENTE',
      nombre: 'Pendiente',
      orden: 1,
      estado: true,
    },
    relaciones_como_origen: [],
  } as ObjetivoEstrategicoEntityEnriquecido;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resuelve sin consultar el repositorio si no hay destinos', async () => {
    await expect(
      service.execute({
        plan_estrategico_id: 1,
        tipo_modulo_id: 7,
        relaciones_destino_ids: [],
      }),
    ).resolves.toBeUndefined();

    expect(findById).not.toHaveBeenCalled();
    expect(existeRelacionInversa).not.toHaveBeenCalled();
    expect(findRelacionesActivasPorPlanYTipo).not.toHaveBeenCalled();
  });

  it('lanza 404 si un destino no existe o está inactivo', async () => {
    findById.mockResolvedValue({ ...destino, estado: false });

    await expect(
      service.execute({
        plan_estrategico_id: 1,
        tipo_modulo_id: 7,
        relaciones_destino_ids: [20],
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(existeRelacionInversa).not.toHaveBeenCalled();
    expect(findRelacionesActivasPorPlanYTipo).not.toHaveBeenCalled();
  });

  it('lanza 409 si un destino pertenece a otro plan o tipo de módulo', async () => {
    findById.mockResolvedValue({ ...destino, plan_estrategico_id: 2 });

    await expect(
      service.execute({
        plan_estrategico_id: 1,
        tipo_modulo_id: 7,
        relaciones_destino_ids: [20],
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(existeRelacionInversa).not.toHaveBeenCalled();
    expect(findRelacionesActivasPorPlanYTipo).not.toHaveBeenCalled();
  });

  it('en create valida existencia, plan y tipo sin revisar inversas, auto-relación ni ciclos', async () => {
    findById.mockResolvedValue(destino);

    await expect(
      service.execute({
        plan_estrategico_id: 1,
        tipo_modulo_id: 7,
        relaciones_destino_ids: [20],
      }),
    ).resolves.toBeUndefined();

    expect(findById).toHaveBeenCalledWith(20);
    expect(existeRelacionInversa).not.toHaveBeenCalled();
    expect(findRelacionesActivasPorPlanYTipo).not.toHaveBeenCalled();
  });

  it('lanza 409 si el destino es el mismo objetivo de origen', async () => {
    findRelacionesActivasPorPlanYTipo.mockResolvedValue([]);
    findById.mockResolvedValue({ ...destino, id: 10 });

    await expect(
      service.execute({
        origen_id: 10,
        plan_estrategico_id: 1,
        tipo_modulo_id: 7,
        relaciones_destino_ids: [10],
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(existeRelacionInversa).not.toHaveBeenCalled();
  });

  it('lanza 409 si ya existe la relación inversa', async () => {
    findRelacionesActivasPorPlanYTipo.mockResolvedValue([]);
    findById.mockResolvedValue(destino);
    existeRelacionInversa.mockResolvedValue(true);

    await expect(
      service.execute({
        origen_id: 10,
        plan_estrategico_id: 1,
        tipo_modulo_id: 7,
        relaciones_destino_ids: [20],
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(existeRelacionInversa).toHaveBeenCalledWith(10, 20);
  });

  it('lanza 409 si la relación crea un ciclo de dos o más saltos', async () => {
    findRelacionesActivasPorPlanYTipo.mockResolvedValue([
      { origen_id: 20, destino_id: 30 },
      { origen_id: 30, destino_id: 10 },
    ]);
    findById.mockResolvedValue(destino);
    existeRelacionInversa.mockResolvedValue(false);

    await expect(
      service.execute({
        origen_id: 10,
        plan_estrategico_id: 1,
        tipo_modulo_id: 7,
        relaciones_destino_ids: [20],
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(existeRelacionInversa).toHaveBeenCalledWith(10, 20);
  });

  it('valida múltiples destinos válidos y consulta cada uno una sola vez', async () => {
    findRelacionesActivasPorPlanYTipo.mockResolvedValue([
      { origen_id: 40, destino_id: 50 },
    ]);
    findById.mockImplementation((id: number) =>
      Promise.resolve({ ...destino, id }),
    );
    existeRelacionInversa.mockResolvedValue(false);

    await expect(
      service.execute({
        origen_id: 10,
        plan_estrategico_id: 1,
        tipo_modulo_id: 7,
        relaciones_destino_ids: [20, 30],
      }),
    ).resolves.toBeUndefined();

    expect(findById).toHaveBeenCalledTimes(2);
    expect(findById).toHaveBeenNthCalledWith(1, 20);
    expect(findById).toHaveBeenNthCalledWith(2, 30);
    expect(existeRelacionInversa).toHaveBeenCalledTimes(2);
    expect(findRelacionesActivasPorPlanYTipo).toHaveBeenCalledWith(1, 7);
  });
});
