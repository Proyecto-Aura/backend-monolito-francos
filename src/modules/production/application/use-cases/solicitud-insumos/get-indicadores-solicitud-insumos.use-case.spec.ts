import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';
import { GetIndicadoresSolicitudInsumosUseCase } from './get-indicadores-solicitud-insumos.use-case';

describe('GetIndicadoresSolicitudInsumosUseCase', () => {
  it('devuelve los indicadores del repositorio sin modificarlos', async () => {
    const indicadores = {
      pendiente: 1,
      en_proceso: 2,
      entregado: 3,
      rechazado: 4,
      total: 10,
    };
    const getIndicadores = jest.fn().mockResolvedValue(indicadores);
    const repository = {
      getIndicadores,
    } as unknown as SolicitudInsumosRepository;
    const useCase = new GetIndicadoresSolicitudInsumosUseCase(repository);

    await expect(useCase.execute()).resolves.toBe(indicadores);
    expect(getIndicadores).toHaveBeenCalledTimes(1);
    expect(getIndicadores).toHaveBeenCalledWith();
  });
});
