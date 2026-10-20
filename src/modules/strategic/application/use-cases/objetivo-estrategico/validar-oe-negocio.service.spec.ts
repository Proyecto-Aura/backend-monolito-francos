import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { ObjetivoEstrategicoRepository } from '../../../domain/repositories/objetivo-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ObjetivoEstrategicoEntityEnriquecido } from '../../../domain/repositories/types/objetivo-estrategico-repository.types';
import { ValidarOeNegocioService } from './validar-oe-negocio.service';

describe('ValidarOeNegocioService', () => {
  const findObjetivoActivoById = jest.fn();
  const objetivoEstrategicoRepository = {
    findActivoById: findObjetivoActivoById,
  } as unknown as jest.Mocked<ObjetivoEstrategicoRepository>;

  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;

  const service = new ValidarOeNegocioService(
    objetivoEstrategicoRepository,
    tipoModuloRepository,
  );

  const tipoModuloNegocio = {
    id: 7,
    codigo: 'NEG',
    nombre: 'Negocio',
    estado: true,
  };

  const objetivoNegocio = {
    id: 20,
    plan_estrategico_id: 1,
    tipo_modulo_id: tipoModuloNegocio.id,
    estado: true,
  } as ObjetivoEstrategicoEntityEnriquecido;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza 404 si el objetivo de Negocio no existe o está inactivo', async () => {
    findObjetivoActivoById.mockResolvedValue(null);

    await expect(
      service.execute({ oe_negocio_id: 20, plan_estrategico_id: 1 }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(findObjetivoActivoById).toHaveBeenCalledWith(20);
    expect(findTipoModuloByCodigo).not.toHaveBeenCalled();
  });

  it('lanza 409 si el objetivo vinculado no es de Negocio', async () => {
    findObjetivoActivoById.mockResolvedValue({
      ...objetivoNegocio,
      tipo_modulo_id: 9,
    });
    findTipoModuloByCodigo.mockResolvedValue(tipoModuloNegocio);

    await expect(
      service.execute({ oe_negocio_id: 20, plan_estrategico_id: 1 }),
    ).rejects.toThrow(
      new ResourceConflictError(
        'El objetivo vinculado debe ser un objetivo estratégico de Negocio',
      ),
    );

    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('NEG');
  });

  it('lanza 409 si el objetivo de Negocio pertenece a otro plan', async () => {
    findObjetivoActivoById.mockResolvedValue({
      ...objetivoNegocio,
      plan_estrategico_id: 2,
    });
    findTipoModuloByCodigo.mockResolvedValue(tipoModuloNegocio);

    await expect(
      service.execute({ oe_negocio_id: 20, plan_estrategico_id: 1 }),
    ).rejects.toThrow(
      new ResourceConflictError(
        'El objetivo de Negocio vinculado debe pertenecer al mismo plan',
      ),
    );
  });

  it('resuelve sin error si el objetivo es de Negocio y pertenece al mismo plan', async () => {
    findObjetivoActivoById.mockResolvedValue(objetivoNegocio);
    findTipoModuloByCodigo.mockResolvedValue(tipoModuloNegocio);

    await expect(
      service.execute({ oe_negocio_id: 20, plan_estrategico_id: 1 }),
    ).resolves.toBeUndefined();

    expect(findObjetivoActivoById).toHaveBeenCalledWith(20);
    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('NEG');
  });
});
