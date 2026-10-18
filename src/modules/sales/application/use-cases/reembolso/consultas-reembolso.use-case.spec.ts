import { EstadoReembolso } from '../../../domain/enums';
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { ReembolsoRepository } from '../../../domain/repositories/reembolso.repository';
import { EvidenciaReembolsoService } from '../../../domain/services/evidencia-reembolso.service';
import { ListReembolsosQueryDto } from '../../dto/reembolso-dtos/list-reembolsos-query.dto';
import { GetReembolsoByIdUseCase } from './get-reembolso-by-id.use-case';
import { ListReembolsosUseCase } from './list-reembolsos.use-case';
import { makeSolicitud } from './reembolso.fixtures';

describe('Consultas de reembolsos', () => {
  const findMany = jest.fn();
  const findById = jest.fn();
  const reembolsoRepository = {
    findMany,
    findById,
  } as unknown as jest.Mocked<ReembolsoRepository>;

  const urlDescarga = jest.fn();
  const evidenciaService = {
    urlDescarga,
  } as unknown as jest.Mocked<EvidenciaReembolsoService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ListReembolsosUseCase (RF-A039, RF-A040)', () => {
    const useCase = new ListReembolsosUseCase(reembolsoRepository);

    const query = (overrides: Partial<ListReembolsosQueryDto> = {}) =>
      Object.assign(new ListReembolsosQueryDto(), overrides);

    it('filtra por estado y convierte las fechas de Lima en un rango', async () => {
      findMany.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });

      await useCase.execute(
        query({
          estado: EstadoReembolso.PENDIENTE,
          fecha_desde: '2026-10-17',
          fecha_hasta: '2026-10-17',
        }),
      );

      expect(findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        estado: EstadoReembolso.PENDIENTE,
        desde: new Date('2026-10-17T05:00:00.000Z'),
        hasta: new Date('2026-10-18T05:00:00.000Z'),
        q: undefined,
      });
    });

    it('limpia los espacios del texto de búsqueda e ignora uno vacío', async () => {
      findMany.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });

      await useCase.execute(query({ q: '  SOL-000003 ' }));
      expect(findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'SOL-000003' }),
      );

      await useCase.execute(query({ q: '   ' }));
      expect(findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: undefined }),
      );
    });

    it('rechaza una fecha desde posterior a la fecha hasta', () => {
      expect(() =>
        useCase.execute(
          query({ fecha_desde: '2026-10-18', fecha_hasta: '2026-10-17' }),
        ),
      ).toThrow(InvalidRequestError);
    });
  });

  describe('GetReembolsoByIdUseCase (RF-A041)', () => {
    const useCase = new GetReembolsoByIdUseCase(
      reembolsoRepository,
      evidenciaService,
    );

    it('devuelve la solicitud con el enlace de descarga de la evidencia', async () => {
      findById.mockResolvedValue(makeSolicitud());
      urlDescarga.mockResolvedValue('https://docs/firmada');

      const detalle = await useCase.execute(3);

      expect(urlDescarga).toHaveBeenCalledWith(
        'reembolsos/SOL-000003/acta-recepcion.pdf',
      );
      expect(detalle.evidencia_url).toBe('https://docs/firmada');
      expect(detalle.pedido_codigo).toBe('PED-000009');
    });

    it('sin evidencia no pide enlace', async () => {
      findById.mockResolvedValue(makeSolicitud({ evidencia_key: null }));

      const detalle = await useCase.execute(3);

      expect(urlDescarga).not.toHaveBeenCalled();
      expect(detalle.evidencia_url).toBeNull();
    });

    it('responde 404 si la solicitud no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(3)).rejects.toThrow(ResourceNotFoundError);
    });
  });
});
