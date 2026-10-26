import { EstadoPedido } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { ReembolsoRepository } from '../../../domain/repositories/reembolso.repository';
import { PedidoParaReembolso } from '../../../domain/repositories/types/reembolso-repository.types';
import { EvidenciaReembolsoService } from '../../../domain/services/evidencia-reembolso.service';
import { SolicitarReembolsoDto } from '../../dto/reembolso-dtos/solicitar-reembolso.dto';
import { makeSolicitud } from './reembolso.fixtures';
import { SolicitarReembolsoUseCase } from './solicitar-reembolso.use-case';

describe('SolicitarReembolsoUseCase (HU-B-014)', () => {
  const USER_ID = 'a1b2c3d4-1111-4d2b-8b1f-4c6c3a7a0009';
  const CLIENTE_ID = 'c1c1c1c1-2222-4d2b-8b1f-4c6c3a7a0001';
  const KEY = 'reembolsos/SOL-000042/Acta-recepcion.pdf';

  const findClienteParaResumenPorUser = jest.fn();
  const pedidoRepository = {
    findClienteParaResumenPorUser,
  } as unknown as jest.Mocked<PedidoRepository>;

  const findPedidoParaReembolso = jest.fn();
  const reservarCodigo = jest.fn();
  const crearSolicitud = jest.fn();
  const reembolsoRepository = {
    findPedidoParaReembolso,
    reservarCodigo,
    crearSolicitud,
  } as unknown as jest.Mocked<ReembolsoRepository>;

  const subir = jest.fn();
  const borrar = jest.fn();
  const urlDescarga = jest.fn();
  const evidenciaService = {
    subir,
    borrar,
    urlDescarga,
  } as unknown as jest.Mocked<EvidenciaReembolsoService>;

  const useCase = new SolicitarReembolsoUseCase(
    pedidoRepository,
    reembolsoRepository,
    evidenciaService,
  );

  const dto = Object.assign(new SolicitarReembolsoDto(), {
    pedido_id: 9,
    motivo: 'Producto en mal estado',
    descripcion: 'Llegaron 4 packs con la bolsa rota.',
  });

  const evidencia = {
    nombre: 'Acta recepción.pdf',
    tipo: 'application/pdf',
    contenido: Buffer.from('%PDF-1.4'),
  };

  const pedido = (
    overrides: Partial<PedidoParaReembolso> = {},
  ): PedidoParaReembolso => ({
    id: 9,
    codigo: 'PED-000009',
    cliente_id: CLIENTE_ID,
    estado: EstadoPedido.ENTREGADO,
    pago: { id: 5, monto: 249.9 },
    tiene_reembolso: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findClienteParaResumenPorUser.mockResolvedValue({
      id: CLIENTE_ID,
      estado: true,
      direccion: null,
    });
    findPedidoParaReembolso.mockResolvedValue(pedido());
    reservarCodigo.mockResolvedValue({ id: 42, codigo: 'SOL-000042' });
    crearSolicitud.mockResolvedValue(makeSolicitud());
    subir.mockResolvedValue(undefined);
    borrar.mockResolvedValue(undefined);
    urlDescarga.mockResolvedValue('https://docs/firmada');
  });

  it('sube la evidencia y registra la solicitud pendiente con el monto del pago', async () => {
    const resultado = await useCase.execute(dto, evidencia, USER_ID);

    expect(findClienteParaResumenPorUser).toHaveBeenCalledWith(USER_ID);
    expect(findPedidoParaReembolso).toHaveBeenCalledWith(9);
    expect(subir).toHaveBeenCalledWith(
      KEY,
      evidencia.contenido,
      'application/pdf',
    );
    expect(crearSolicitud).toHaveBeenCalledWith({
      id: 42,
      codigo: 'SOL-000042',
      pago_id: 5,
      monto: 249.9,
      motivo_cliente:
        'Producto en mal estado: Llegaron 4 packs con la bolsa rota.',
      evidencia_key: KEY,
    });
    expect(urlDescarga).toHaveBeenCalledWith(KEY);
    expect(resultado.evidencia_url).toBe('https://docs/firmada');
    expect(borrar).not.toHaveBeenCalled();
  });

  it('reserva el código antes de subir la evidencia y la sube antes de registrar', async () => {
    await useCase.execute(dto, evidencia, USER_ID);

    const [reserva] = reservarCodigo.mock.invocationCallOrder;
    const [subida] = subir.mock.invocationCallOrder;
    const [registro] = crearSolicitud.mock.invocationCallOrder;
    expect(reserva).toBeLessThan(subida);
    expect(subida).toBeLessThan(registro);
  });

  it.each([EstadoPedido.CONFIRMADO, EstadoPedido.CANCELADO])(
    'acepta un pedido %s',
    async (estado) => {
      findPedidoParaReembolso.mockResolvedValue(pedido({ estado }));

      await expect(
        useCase.execute(dto, evidencia, USER_ID),
      ).resolves.toBeDefined();
    },
  );

  it('sin cliente para el usuario devuelve 404', async () => {
    findClienteParaResumenPorUser.mockResolvedValue(null);

    await expect(
      useCase.execute(dto, evidencia, USER_ID),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(subir).not.toHaveBeenCalled();
  });

  it('un cliente inactivo devuelve 409', async () => {
    findClienteParaResumenPorUser.mockResolvedValue({
      id: CLIENTE_ID,
      estado: false,
      direccion: null,
    });

    await expect(
      useCase.execute(dto, evidencia, USER_ID),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(subir).not.toHaveBeenCalled();
  });

  it('un pedido que no existe devuelve 404', async () => {
    findPedidoParaReembolso.mockResolvedValue(null);

    await expect(
      useCase.execute(dto, evidencia, USER_ID),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it('un pedido de otro cliente devuelve 404', async () => {
    findPedidoParaReembolso.mockResolvedValue(
      pedido({ cliente_id: 'otro-cliente' }),
    );

    await expect(useCase.execute(dto, evidencia, USER_ID)).rejects.toThrow(
      'Pedido no encontrado',
    );
    expect(subir).not.toHaveBeenCalled();
  });

  it('un pedido sin pago devuelve 409', async () => {
    findPedidoParaReembolso.mockResolvedValue(pedido({ pago: null }));

    await expect(useCase.execute(dto, evidencia, USER_ID)).rejects.toThrow(
      'El pedido PED-000009 no tiene un pago registrado; no se puede reembolsar',
    );
  });

  it.each([
    EstadoPedido.EN_ESPERA_INVENTARIO,
    EstadoPedido.EN_PREPARACION,
    EstadoPedido.PENDIENTE_ENTREGA,
    EstadoPedido.EN_CAMINO,
  ])('un pedido %s devuelve 409', async (estado) => {
    findPedidoParaReembolso.mockResolvedValue(pedido({ estado }));

    await expect(
      useCase.execute(dto, evidencia, USER_ID),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(reservarCodigo).not.toHaveBeenCalled();
    expect(subir).not.toHaveBeenCalled();
  });

  it('un pedido que ya tiene solicitud devuelve 409', async () => {
    findPedidoParaReembolso.mockResolvedValue(
      pedido({ tiene_reembolso: true }),
    );

    await expect(useCase.execute(dto, evidencia, USER_ID)).rejects.toThrow(
      'El pedido PED-000009 ya tiene una solicitud de reembolso registrada',
    );
    expect(subir).not.toHaveBeenCalled();
  });

  it('si el registro choca en carrera (409) borra la evidencia subida', async () => {
    const conflicto = new ResourceConflictError(
      'El pedido ya tiene una solicitud de reembolso registrada',
    );
    crearSolicitud.mockRejectedValue(conflicto);

    await expect(useCase.execute(dto, evidencia, USER_ID)).rejects.toBe(
      conflicto,
    );
    expect(borrar).toHaveBeenCalledWith(KEY);
  });

  it('si el registro falla por otro motivo también borra la evidencia', async () => {
    const fallo = new Error('conexión perdida');
    crearSolicitud.mockRejectedValue(fallo);

    await expect(useCase.execute(dto, evidencia, USER_ID)).rejects.toBe(fallo);
    expect(borrar).toHaveBeenCalledWith(KEY);
  });

  it('si además falla el borrado responde con el error original', async () => {
    const conflicto = new ResourceConflictError('duplicada');
    crearSolicitud.mockRejectedValue(conflicto);
    borrar.mockRejectedValue(new Error('S3 caído'));

    await expect(useCase.execute(dto, evidencia, USER_ID)).rejects.toBe(
      conflicto,
    );
  });

  it('si la subida falla no registra la solicitud', async () => {
    subir.mockRejectedValue(new Error('S3 caído'));

    await expect(useCase.execute(dto, evidencia, USER_ID)).rejects.toThrow(
      'S3 caído',
    );
    expect(crearSolicitud).not.toHaveBeenCalled();
  });
});
