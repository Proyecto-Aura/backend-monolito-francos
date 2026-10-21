import { InsumoRepository } from '../../../domain/repositories/insumo.repository';
import { GetIndicadoresInsumoUseCase } from './get-indicadores-insumo.use-case';

describe('GetIndicadoresInsumoUseCase', () => {
  const getIndicadores = jest.fn();
  const insumoRepository = {
    getIndicadores,
  } as unknown as jest.Mocked<InsumoRepository>;
  const useCase = new GetIndicadoresInsumoUseCase(insumoRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve el conteo que entrega el repositorio', async () => {
    const resultado = { agotado: 1, bajo: 2, normal: 5, alto: 1, total: 9 };
    getIndicadores.mockResolvedValue(resultado);

    await expect(useCase.execute()).resolves.toBe(resultado);
  });
});
