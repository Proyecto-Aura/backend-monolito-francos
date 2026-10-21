import { TipoInsumo, UnidadMedidaInsumo } from '../../../domain/enums';
import { ResourceConflictError } from '../../../domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';
import { CreateInsumoUseCase } from './create-insumo.use-case';

describe('CreateInsumoUseCase', () => {
  const create = jest.fn();
  const insumoRepository = {
    create,
  } as unknown as jest.Mocked<InsumoRepository>;
  const useCase = new CreateInsumoUseCase(insumoRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    create.mockImplementation((params: object) => Promise.resolve(params));
  });

  it('crea un insumo activo con stock_actual por defecto en 0 (el sku lo genera el repositorio)', async () => {
    await useCase.execute({
      nombre: 'Harina de trigo',
      unidad_medida: UnidadMedidaInsumo.KG,
      stock_minimo: 10,
      stock_maximo: 200,
      tipo: TipoInsumo.MATERIA_PRIMA,
    });

    expect(create).toHaveBeenCalledWith({
      nombre: 'Harina de trigo',
      descripcion: null,
      unidad_medida: UnidadMedidaInsumo.KG,
      stock_actual: 0,
      stock_minimo: 10,
      stock_maximo: 200,
      tipo: TipoInsumo.MATERIA_PRIMA,
      estado: true,
    });
  });

  it('normaliza la descripción cuando se envía', async () => {
    await useCase.execute({
      nombre: 'Harina de trigo',
      descripcion: '  Harina   000, marca Nicolini ',
      unidad_medida: UnidadMedidaInsumo.KG,
      stock_minimo: 10,
      stock_maximo: 500,
      tipo: TipoInsumo.MATERIA_PRIMA,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        descripcion: 'Harina 000, marca Nicolini',
        stock_maximo: 500,
      }),
    );
  });

  it('lanza 409 si el stock_maximo es menor que el stock_minimo y no crea nada', async () => {
    await expect(
      useCase.execute({
        nombre: 'Harina de trigo',
        unidad_medida: UnidadMedidaInsumo.KG,
        stock_minimo: 50,
        stock_maximo: 10,
        tipo: TipoInsumo.MATERIA_PRIMA,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(create).not.toHaveBeenCalled();
  });

  it('normaliza el nombre (sin espacios de más)', async () => {
    await useCase.execute({
      nombre: '  Harina   de  trigo ',
      unidad_medida: UnidadMedidaInsumo.KG,
      stock_minimo: 10,
      stock_maximo: 200,
      tipo: TipoInsumo.MATERIA_PRIMA,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Harina de trigo' }),
    );
  });

  it('crea siempre con stock_actual en 0 y respeta el estado enviado', async () => {
    await useCase.execute({
      nombre: 'Caja de empaque',
      unidad_medida: UnidadMedidaInsumo.UNIDAD,
      stock_minimo: 5,
      stock_maximo: 100,
      tipo: TipoInsumo.EMPAQUE,
      estado: false,
    });

    // stock_actual no se recibe por DTO: nace en 0 y lo sincroniza el
    // trigger trg_recalcular_stock_insumo a partir de los lotes reales.
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ stock_actual: 0, estado: false }),
    );
  });
});
