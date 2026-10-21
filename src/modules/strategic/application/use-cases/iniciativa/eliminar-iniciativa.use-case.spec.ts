import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { IniciativaEntityEnriquecido } from '../../../domain/repositories/types/iniciativa-repository.types';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { EliminarIniciativaUseCase } from './eliminar-iniciativa.use-case';

describe('EliminarIniciativaUseCase', () => {
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
  const useCase = new EliminarIniciativaUseCase(
    iniciativaRepository,
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
    plan_estrategico_id: plan.id,
    estado: true,
  } as ObjetivoEstrategicoEntityEnriquecido;
  const iniciativa = {
    id: 20,
    estado: true,
    objetivo_estrategico: { id: objetivo.id },
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
  });

  it.each([null, { ...iniciativa, estado: false }])(
    'lanza 404 si la iniciativa no existe o está inactiva',
    async (resultado) => {
      findIniciativaById.mockResolvedValue(resultado);

      await expect(useCase.execute(iniciativa.id)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
      expect(findObjetivoActivoById).not.toHaveBeenCalled();
      expect(setEstado).not.toHaveBeenCalled();
    },
  );

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
