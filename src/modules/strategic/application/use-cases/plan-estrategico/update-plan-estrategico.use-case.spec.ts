import { ResourceConflictError } from '../../../domain/errors/strategic-domain.errors';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { UpdatePlanEstrategicoDto } from '../../dto/plan-estrategico-dtos/update-plan-estrategico.dto';
import { UpdatePlanEstrategicoUseCase } from './update-plan-estrategico.use-case';

describe('UpdatePlanEstrategicoUseCase', () => {
  const findById = jest.fn();
  const existsByName = jest.fn();
  const update = jest.fn();
  const repository = {
    findById,
    existsByName,
    update,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const useCase = new UpdatePlanEstrategicoUseCase(repository);

  const createPlan = (
    codigoEstado: string,
  ): PlanEstrategicoEntityConEstado => ({
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan Estratégico 2026',
    descripcion: null,
    anio_inicio: 2026,
    anio_fin: 2030,
    estado_plan_id: codigoEstado === 'BORRADOR' ? 1 : 2,
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    estado_plan: {
      id: codigoEstado === 'BORRADOR' ? 1 : 2,
      codigo: codigoEstado,
      nombre: codigoEstado,
      orden: codigoEstado === 'BORRADOR' ? 1 : 2,
      estado: true,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('edita un plan en borrador', async () => {
    const plan = createPlan('BORRADOR');
    const planActualizado = { ...plan, nombre: 'Plan Actualizado' };
    findById.mockResolvedValue(plan);
    existsByName.mockResolvedValue(false);
    update.mockResolvedValue(planActualizado);

    await expect(
      useCase.execute(1, {
        nombre: '  Plan   Actualizado  ',
        descripcion: 'Nueva descripción',
        anio_inicio: 2027,
        anio_fin: 2031,
      }),
    ).resolves.toBe(planActualizado);

    expect(existsByName).toHaveBeenCalledWith('Plan Actualizado', 1);
    expect(update).toHaveBeenCalledWith(1, {
      nombre: 'Plan Actualizado',
      descripcion: 'Nueva descripción',
      anio_inicio: 2027,
      anio_fin: 2031,
    });
  });

  it('lanza 409 si el plan no está en borrador', async () => {
    findById.mockResolvedValue(createPlan('ACTIVO'));

    await expect(
      useCase.execute(1, { nombre: 'Plan Actualizado' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    { dto: { anio_inicio: 2031 }, caso: 'usa el año de fin actual' },
    { dto: { anio_fin: 2025 }, caso: 'usa el año de inicio actual' },
  ])('lanza 409 si el rango resultante es inválido: $caso', async ({ dto }) => {
    findById.mockResolvedValue(createPlan('BORRADOR'));

    await expect(useCase.execute(1, dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el nuevo nombre ya existe y excluye el ID actual', async () => {
    findById.mockResolvedValue(createPlan('BORRADOR'));
    existsByName.mockResolvedValue(true);

    await expect(
      useCase.execute(1, { nombre: '  Otro   Plan  ' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(existsByName).toHaveBeenCalledWith('Otro Plan', 1);
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    { dto: { descripcion: 'Sin cambiar el nombre' }, caso: 'no viene' },
    { dto: { nombre: 'plan estratégico 2026' }, caso: 'es igual al actual' },
  ])(
    'no consulta duplicados cuando el nombre $caso',
    async ({ dto }: { dto: UpdatePlanEstrategicoDto; caso: string }) => {
      const plan = createPlan('BORRADOR');
      findById.mockResolvedValue(plan);
      update.mockResolvedValue(plan);

      await useCase.execute(1, dto);

      expect(existsByName).not.toHaveBeenCalled();
    },
  );
});
