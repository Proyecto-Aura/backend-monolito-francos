import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { IniciativaEntityEnriquecido } from '../../../domain/repositories/types/iniciativa-repository.types';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { EliminarIniciativaTiUseCase } from './eliminar-iniciativa-ti.use-case';

describe('EliminarIniciativaTiUseCase', () => {
  const findIniciativaById = jest.fn();
  const setEstado = jest.fn();
  const iniciativaRepository = {
    findById: findIniciativaById,
    setEstado,
  } as unknown as jest.Mocked<IniciativaRepository>;
  const findObjetivoActivoById = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const tipoModuloTi = { id: 8, codigo: 'TI', estado: true };
  const tipoModuloNeg = { id: 7, codigo: 'NEG', estado: true };
  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;
  const useCase = new EliminarIniciativaTiUseCase(
    iniciativaRepository,
    tipoModuloRepository,
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
  );

  const plan = {
    id: 1,
    estado: true,
    estado_plan: { id: 1, codigo: 'BORRADOR', estado: true },
  } as PlanEstrategicoEntityConEstado;
  const objetivo = {
    id: 10,
    tipo_modulo_id: tipoModuloTi.id,
    plan_estrategico_id: plan.id,
    estado: true,
  } as ObjetivoEstrategicoEntityEnriquecido;
  const iniciativa = {
    id: 20,
    estado: true,
    objetivo_estrategico: { id: objetivo.id, tipo_modulo_id: tipoModuloTi.id },
    estado_iniciativa: {
      id: 1,
      codigo: 'PENDIENTE',
      nombre: 'Pendiente',
      orden: 1,
      estado: true,
    },
  } as IniciativaEntityEnriquecido;

  const prepararBase = () => {
    findIniciativaById.mockResolvedValue(iniciativa);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(plan);
    setEstado.mockResolvedValue({ ...iniciativa, estado: false });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findTipoModuloByCodigo.mockResolvedValue(tipoModuloTi);
  });

  it.each([null, { ...iniciativa, estado: false }])(
    'lanza 404 si la iniciativa no existe o está inactiva',
    async (resultado) => {
      findIniciativaById.mockResolvedValue(resultado);

      await expect(useCase.execute(iniciativa.id)).rejects.toThrow(
        new ResourceNotFoundError('Iniciativa no encontrada'),
      );
      expect(findObjetivoActivoById).not.toHaveBeenCalled();
      expect(setEstado).not.toHaveBeenCalled();
    },
  );

  it('lanza 404 si la iniciativa es de Negocio', async () => {
    prepararBase();
    findIniciativaById.mockResolvedValue({
      ...iniciativa,
      objetivo_estrategico: {
        ...iniciativa.objetivo_estrategico,
        tipo_modulo_id: tipoModuloNeg.id,
      },
    });

    const resultado = useCase.execute(iniciativa.id);

    await expect(resultado).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(resultado).rejects.toMatchObject({
      statusCode: 404,
      message: 'Iniciativa no encontrada',
    });
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(findObjetivoActivoById).not.toHaveBeenCalled();
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 404 si el objetivo no existe', async () => {
    findIniciativaById.mockResolvedValue(iniciativa);
    findObjetivoActivoById.mockResolvedValue(null);

    await expect(useCase.execute(iniciativa.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan no existe', async () => {
    findIniciativaById.mockResolvedValue(iniciativa);
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(iniciativa.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(setEstado).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en Borrador', async () => {
    prepararBase();
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });

    await expect(useCase.execute(iniciativa.id)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(setEstado).not.toHaveBeenCalled();
  });

  it.each(['EN_PROCESO', 'COMPLETADA', 'CANCELADA'])(
    'lanza 409 si el estado de la iniciativa es %s',
    async (codigo) => {
      prepararBase();
      findIniciativaById.mockResolvedValue({
        ...iniciativa,
        estado_iniciativa: { ...iniciativa.estado_iniciativa, codigo },
      });

      await expect(useCase.execute(iniciativa.id)).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
      expect(setEstado).not.toHaveBeenCalled();
    },
  );

  it('elimina lógicamente una iniciativa Pendiente', async () => {
    prepararBase();
    const eliminada = { ...iniciativa, estado: false };
    setEstado.mockResolvedValue(eliminada);

    await expect(useCase.execute(iniciativa.id)).resolves.toBe(eliminada);
    expect(setEstado).toHaveBeenCalledWith(iniciativa.id, false);
  });
});
