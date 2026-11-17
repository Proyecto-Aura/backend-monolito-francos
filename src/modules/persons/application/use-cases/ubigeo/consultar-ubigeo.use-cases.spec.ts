import { UbigeoRepository } from '../../../domain/repositories/ubigeo.repository';
import {
  ListDepartamentosUseCase,
  ListDistritosUseCase,
  ListProvinciasUseCase,
} from './consultar-ubigeo.use-cases';

describe('Consulta de ubigeo', () => {
  const repository = {
    listDepartamentos: jest.fn(),
    listProvincias: jest.fn(),
    listDistritos: jest.fn(),
  };
  const ubigeo = repository as unknown as UbigeoRepository;

  beforeEach(() => jest.clearAllMocks());

  it('lista los departamentos', async () => {
    const departamentos = [{ id: '15', nombre: 'Lima' }];
    repository.listDepartamentos.mockResolvedValue(departamentos);

    await expect(new ListDepartamentosUseCase(ubigeo).execute()).resolves.toBe(
      departamentos,
    );
  });

  it('lista las provincias del departamento indicado', async () => {
    const provincias = [{ id: '1501', nombre: 'Lima' }];
    repository.listProvincias.mockResolvedValue(provincias);

    await expect(new ListProvinciasUseCase(ubigeo).execute('15')).resolves.toBe(
      provincias,
    );
    expect(repository.listProvincias).toHaveBeenCalledWith('15');
  });

  it('lista los distritos de la provincia indicada', async () => {
    const distritos = [{ id: '150131', nombre: 'San Isidro' }];
    repository.listDistritos.mockResolvedValue(distritos);

    await expect(
      new ListDistritosUseCase(ubigeo).execute('1501'),
    ).resolves.toBe(distritos);
    expect(repository.listDistritos).toHaveBeenCalledWith('1501');
  });
});
