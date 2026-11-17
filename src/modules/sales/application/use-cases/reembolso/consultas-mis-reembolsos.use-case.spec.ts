import { EstadoReembolso } from '../../../domain/enums';
import { ResourceNotFoundError } from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { ReembolsoRepository } from '../../../domain/repositories/reembolso.repository';
import { EvidenciaReembolsoService } from '../../../domain/services/evidencia-reembolso.service';
import { ListMisReembolsosQueryDto } from '../../dto/reembolso-dtos/list-mis-reembolsos-query.dto';
import { GetMiReembolsoUseCase } from './get-mi-reembolso.use-case';
import { ListMisReembolsosUseCase } from './list-mis-reembolsos.use-case';
import { makeSolicitud } from './reembolso.fixtures';

describe('Consultas de reembolsos del cliente (RF-B41)', () => {
  const USER_ID = 'a1b2c3d4-1111-4d2b-8b1f-4c6c3a7a0009';
  const CLIENTE_ID = 'c1c1c1c1-2222-4d2b-8b1f-4c6c3a7a0001';

  const findClienteParaResumenPorUser = jest.fn();
  const pedidoRepository = {
    findClienteParaResumenPorUser,
  } as unknown as jest.Mocked<PedidoRepository>;

  const findManyDeCliente = jest.fn();
  const findByIdDeCliente = jest.fn();
  const reembolsoRepository = {
    findManyDeCliente,
    findByIdDeCliente,
  } as unknown as jest.Mocked<ReembolsoRepository>;

  const urlDescarga = jest.fn();
  const evidenciaService = {
    urlDescarga,
  } as unknown as jest.Mocked<EvidenciaReembolsoService>;

  beforeEach(() => {
    jest.clearAllMocks();
    findClienteParaResumenPorUser.mockResolvedValue({
      id: CLIENTE_ID,
      estado: true,
      direccion: null,
    });
  });

  describe('ListMisReembolsosUseCase', () => {
    const useCase = new ListMisReembolsosUseCase(
      pedidoRepository,
      reembolsoRepository,
    );

    it('lista solo las solicitudes del cliente del usuario, con el filtro de estado', async () => {
      const resultado = { data: [], total: 0, page: 2, limit: 5 };
      findManyDeCliente.mockResolvedValue(resultado);

      await expect(
        useCase.execute(
          Object.assign(new ListMisReembolsosQueryDto(), {
            page: 2,
            limit: 5,
            estado: EstadoReembolso.RECHAZADO,
          }),
          USER_ID,
        ),
      ).resolves.toBe(resultado);
      expect(findManyDeCliente).toHaveBeenCalledWith(CLIENTE_ID, {
        page: 2,
        limit: 5,
        estado: EstadoReembolso.RECHAZADO,
      });
    });

    it('sin cliente para el usuario devuelve 404', async () => {
      findClienteParaResumenPorUser.mockResolvedValue(null);

      await expect(
        useCase.execute(new ListMisReembolsosQueryDto(), USER_ID),
      ).rejects.toBeInstanceOf(ResourceNotFoundError);
      expect(findManyDeCliente).not.toHaveBeenCalled();
    });
  });

  describe('GetMiReembolsoUseCase', () => {
    const useCase = new GetMiReembolsoUseCase(
      pedidoRepository,
      reembolsoRepository,
      evidenciaService,
    );

    it('devuelve la solicitud propia con el enlace a la evidencia', async () => {
      findByIdDeCliente.mockResolvedValue(makeSolicitud());
      urlDescarga.mockResolvedValue('https://docs/firmada');

      const detalle = await useCase.execute(3, USER_ID);

      expect(findByIdDeCliente).toHaveBeenCalledWith(3, CLIENTE_ID);
      expect(urlDescarga).toHaveBeenCalledWith(
        'reembolsos/SOL-000003/acta-recepcion.pdf',
      );
      expect(detalle.evidencia_url).toBe('https://docs/firmada');
    });

    it('sin evidencia no pide enlace', async () => {
      findByIdDeCliente.mockResolvedValue(
        makeSolicitud({ evidencia_key: null }),
      );

      await expect(useCase.execute(3, USER_ID)).resolves.toMatchObject({
        evidencia_url: null,
      });
      expect(urlDescarga).not.toHaveBeenCalled();
    });

    it('una solicitud ajena o inexistente devuelve 404', async () => {
      findByIdDeCliente.mockResolvedValue(null);

      await expect(useCase.execute(3, USER_ID)).rejects.toThrow(
        'Solicitud de reembolso no encontrada',
      );
    });

    it('sin cliente para el usuario devuelve 404', async () => {
      findClienteParaResumenPorUser.mockResolvedValue(null);

      await expect(useCase.execute(3, USER_ID)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
      expect(findByIdDeCliente).not.toHaveBeenCalled();
    });
  });
});
