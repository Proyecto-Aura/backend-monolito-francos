import { Logger } from '@nestjs/common';
import { PasarelaNoDisponibleError } from '../../domain/errors/sales-domain.errors';
import { CulqiPasarelaPagoService } from './culqi-pasarela-pago.service';

// El unitario no depende del .env real. El getter difiere la lectura hasta que
// el servicio usa `envs`, porque jest.mock se ejecuta antes que este const.
const mockEnvs = {
  culqiSecretKey: 'sk_test_unitario' as string | undefined,
  culqiApiUrl: 'https://api.culqi.test/v2',
};
jest.mock('../../../../config/envs', () => ({
  get envs() {
    return mockEnvs;
  },
}));

describe('CulqiPasarelaPagoService', () => {
  const service = new CulqiPasarelaPagoService();
  const fetchMock = jest.fn();

  const params = {
    token: 'tkn_test_123',
    monto: 165.6,
    email: 'cliente@francos.test',
    descripcion: "Pedido Franco's",
  };

  const respuesta = (status: number, body: unknown) =>
    ({
      status,
      json: () => Promise.resolve(body),
    }) as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnvs.culqiSecretKey = 'sk_test_unitario';
    global.fetch = fetchMock;
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('crea el cargo en céntimos y devuelve el id de Culqi', async () => {
    fetchMock.mockResolvedValue(
      respuesta(201, {
        object: 'charge',
        id: 'chr_test_abc123',
        creation_date: 1792249440000,
      }),
    );

    await expect(service.cobrar(params)).resolves.toEqual({
      aprobado: true,
      numero_operacion: 'chr_test_abc123',
      fecha: new Date(1792249440000),
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.culqi.test/v2/charges');
    expect(init.headers).toEqual({
      Authorization: 'Bearer sk_test_unitario',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init.body as string)).toEqual({
      amount: 16560,
      currency_code: 'PEN',
      email: 'cliente@francos.test',
      source_id: 'tkn_test_123',
      description: "Pedido Franco's",
    });
  });

  it('devuelve el mensaje para el usuario cuando Culqi rechaza el cargo', async () => {
    fetchMock.mockResolvedValue(
      respuesta(402, {
        object: 'error',
        type: 'card_error',
        user_message: 'Tu tarjeta no tiene fondos suficientes.',
      }),
    );

    await expect(service.cobrar(params)).resolves.toEqual({
      aprobado: false,
      mensaje: 'Tu tarjeta no tiene fondos suficientes.',
    });
  });

  it('trata una llave rechazada (401) como pasarela no disponible', async () => {
    fetchMock.mockResolvedValue(
      respuesta(401, { object: 'error', user_message: 'No autorizado' }),
    );

    await expect(service.cobrar(params)).rejects.toThrow(
      PasarelaNoDisponibleError,
    );
  });

  it('trata un error de red como pasarela no disponible', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));

    await expect(service.cobrar(params)).rejects.toThrow(
      PasarelaNoDisponibleError,
    );
  });

  it('trata un 5xx de Culqi como pasarela no disponible', async () => {
    fetchMock.mockResolvedValue(respuesta(500, null));

    await expect(service.cobrar(params)).rejects.toThrow(
      PasarelaNoDisponibleError,
    );
  });

  it('no llama a Culqi si no hay llave configurada', async () => {
    mockEnvs.culqiSecretKey = undefined;

    await expect(service.cobrar(params)).rejects.toThrow(
      PasarelaNoDisponibleError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no cobra con una llave de producción: solo modo de pruebas', async () => {
    mockEnvs.culqiSecretKey = 'sk_live_produccion';

    await expect(service.cobrar(params)).rejects.toThrow(
      new PasarelaNoDisponibleError(
        'Culqi solo se usa en modo de pruebas: configura una llave sk_test_',
      ),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
