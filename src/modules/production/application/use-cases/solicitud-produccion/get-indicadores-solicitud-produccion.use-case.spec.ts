import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { GetIndicadoresSolicitudProduccionUseCase } from './get-indicadores-solicitud-produccion.use-case';

describe('GetIndicadoresSolicitudProduccionUseCase', () => {
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
    } as unknown as SolicitudProduccionRepository;
    const useCase = new GetIndicadoresSolicitudProduccionUseCase(repository);

    await expect(useCase.execute()).resolves.toBe(indicadores);
    expect(getIndicadores).toHaveBeenCalledTimes(1);
    expect(getIndicadores).toHaveBeenCalledWith();
  });
});
