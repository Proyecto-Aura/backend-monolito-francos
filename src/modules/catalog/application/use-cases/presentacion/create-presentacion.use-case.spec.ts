import { ResourceConflictError } from '../../../domain/errors/catalog-domain.errors';
import { UnidadMedidaPresentacion } from '../../../domain/enums';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import { CreatePresentacionUseCase } from './create-presentacion.use-case';

describe('CreatePresentacionUseCase', () => {
  const existsByCantidadAndUnidadMedida = jest.fn();
  const create = jest.fn();
  const useCase = new CreatePresentacionUseCase({
    existsByCantidadAndUnidadMedida,
    create,
  } as unknown as PresentacionRepository);

  beforeEach(() => {
    jest.resetAllMocks();
    existsByCantidadAndUnidadMedida.mockResolvedValue(false);
    create.mockImplementation((params: object) => Promise.resolve(params));
  });

  it('crea la presentación activa por defecto y sin descripción si no se envía', async () => {
    await useCase.execute({
      cantidad: 250,
      unidad_medida: UnidadMedidaPresentacion.GR,
    });

    expect(existsByCantidadAndUnidadMedida).toHaveBeenCalledWith(250, 'gr');
    expect(create).toHaveBeenCalledWith({
      cantidad: 250,
      unidad_medida: 'gr',
      descripcion: null,
      estado: true,
    });
  });

  it('normaliza los espacios de la descripción', async () => {
    await useCase.execute({
      cantidad: 1,
      unidad_medida: UnidadMedidaPresentacion.KG,
      descripcion: '  Bolsa   de un   kilo. ',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ descripcion: 'Bolsa de un kilo.' }),
    );
  });

  it('guarda null cuando la descripción solo tiene espacios', async () => {
    await useCase.execute({
      cantidad: 1,
      unidad_medida: UnidadMedidaPresentacion.KG,
      descripcion: '    ',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ descripcion: null }),
    );
  });

  it('respeta el estado cuando se envía', async () => {
    await useCase.execute({
      cantidad: 500,
      unidad_medida: UnidadMedidaPresentacion.GR,
      estado: false,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ estado: false }),
    );
  });

  it('lanza 409 si ya existe la misma cantidad y unidad de medida', async () => {
    existsByCantidadAndUnidadMedida.mockResolvedValue(true);

    await expect(
      useCase.execute({
        cantidad: 500,
        unidad_medida: UnidadMedidaPresentacion.GR,
      }),
    ).rejects.toThrow(
      new ResourceConflictError(
        'Ya existe una presentacion con esta cantidad y unidad de medida',
      ),
    );
    expect(create).not.toHaveBeenCalled();
  });
});
