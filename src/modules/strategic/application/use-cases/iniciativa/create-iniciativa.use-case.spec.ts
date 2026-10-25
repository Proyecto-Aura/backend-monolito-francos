import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { IniciativaRepository } from '../../../domain/repositories/iniciativa.repository';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { IniciativaEntityEnriquecido } from '../../../domain/repositories/types/iniciativa-repository.types';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { CreateIniciativaUseCase } from './create-iniciativa.use-case';

describe('CreateIniciativaUseCase', () => {
  const existsByNombre = jest.fn();
  const countByPlanYTipo = jest.fn();
  const create = jest.fn();
  const iniciativaRepository = {
    existsByNombre,
    countByPlanYTipo,
    create,
  } as unknown as jest.Mocked<IniciativaRepository>;
  const findObjetivoActivoById = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;
  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;
  const findTipoModuloById = jest.fn();
  const tipoModuloRepository = {
    findById: findTipoModuloById,
  } as unknown as jest.Mocked<TipoModuloRepository>;
  const useCase = new CreateIniciativaUseCase(
    iniciativaRepository,
    objetivoEstrategicoRepository,
    planEstrategicoRepository,
    tipoModuloRepository,
  );

  const plan = {
    id: 1,
    codigo: 'PE-0001',
    anio_inicio: 2026,
    anio_fin: 2028,
    estado: true,
    estado_plan: { id: 1, codigo: 'BORRADOR', estado: true },
  } as PlanEstrategicoEntityConEstado;
  const objetivo = {
    id: 10,
    tipo_modulo_id: 7,
    plan_estrategico_id: plan.id,
    estado: true,
  } as ObjetivoEstrategicoEntityEnriquecido;
  const tipoModulo = { id: 7, codigo: 'NEG', estado: true };
  const iniciativa = {
    id: 20,
    nombre: 'Programa de fidelización',
    estado: true,
  } as IniciativaEntityEnriquecido;
  const dto = {
    objetivo_estrategico_id: objetivo.id,
    nombre: 'Programa de fidelización',
    descripcion: 'Beneficios para clientes frecuentes',
    responsable: 'Gerencia Comercial',
    fecha_inicio: '2026-01-15',
    fecha_fin: '2028-12-15',
    presupuesto: 15000,
  };

  const prepararBase = () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(plan);
    existsByNombre.mockResolvedValue(false);
    findTipoModuloById.mockResolvedValue(tipoModulo);
    countByPlanYTipo.mockResolvedValue(3);
    create.mockResolvedValue(iniciativa);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza 404 si el objetivo no existe', async () => {
    findObjetivoActivoById.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan no existe', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en Borrador', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivo);
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si la fecha de inicio es posterior a la fecha de fin', async () => {
    prepararBase();

    await expect(
      useCase.execute({
        ...dto,
        fecha_inicio: '2027-06-01',
        fecha_fin: '2027-05-31',
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si la fecha de inicio está fuera de los años del plan', async () => {
    prepararBase();

    await expect(
      useCase.execute({ ...dto, fecha_inicio: '2025-12-31' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si la fecha de fin está fuera de los años del plan', async () => {
    prepararBase();

    await expect(
      useCase.execute({ ...dto, fecha_fin: '2029-01-01' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(existsByNombre).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el nombre ya existe en el objetivo', async () => {
    prepararBase();
    existsByNombre.mockResolvedValue(true);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(findTipoModuloById).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([null, { ...tipoModulo, estado: false }])(
    'lanza 404 si el tipo de módulo NEG no existe o está inactivo',
    async (resultado) => {
      prepararBase();
      findTipoModuloById.mockResolvedValue(resultado);

      await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
      expect(countByPlanYTipo).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    },
  );

  it.each([
    { presupuesto: 15000, esperado: 15000 },
    { presupuesto: undefined, esperado: undefined },
  ])(
    'crea con correlativo correcto y presupuesto $esperado',
    async ({ presupuesto, esperado }) => {
      prepararBase();

      await expect(useCase.execute({ ...dto, presupuesto })).resolves.toBe(
        iniciativa,
      );
      expect(countByPlanYTipo).toHaveBeenCalledWith(plan.id, tipoModulo.id);
      expect(findTipoModuloById).toHaveBeenCalledWith(objetivo.tipo_modulo_id);
      expect(create).toHaveBeenCalledWith(
        {
          objetivo_estrategico_id: objetivo.id,
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          presupuesto: esperado,
          responsable: dto.responsable,
          fecha_inicio: new Date(dto.fecha_inicio),
          fecha_fin: new Date(dto.fecha_fin),
        },
        plan.codigo,
        '004',
        'N',
      );
    },
  );
});
