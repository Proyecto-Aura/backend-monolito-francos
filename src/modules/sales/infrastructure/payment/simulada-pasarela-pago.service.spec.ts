import {
  MENSAJE_RECHAZO_SIMULADO,
  MENSAJE_TOKEN_SIMULADO_INVALIDO,
  SimuladaPasarelaPagoService,
} from './simulada-pasarela-pago.service';

describe('SimuladaPasarelaPagoService', () => {
  const pasarela = new SimuladaPasarelaPagoService();
  const params = (token: string) => ({
    token,
    monto: 25.5,
    email: 'cliente@francos.test',
    descripcion: "Pedido Franco's",
  });

  it('aprueba el cobro con un token tkn_sim_ok_*', async () => {
    const resultado = await pasarela.cobrar(params('tkn_sim_ok_abc'));

    expect(resultado).toEqual({
      aprobado: true,
      numero_operacion: expect.stringMatching(
        /^chr_sim_[0-9a-f]{20}$/,
      ) as unknown,
      fecha: expect.any(Date) as unknown,
    });
  });

  it('da un número de operación distinto en cada cobro', async () => {
    const [a, b] = await Promise.all([
      pasarela.cobrar(params('tkn_sim_ok_1')),
      pasarela.cobrar(params('tkn_sim_ok_1')),
    ]);

    expect(a).toMatchObject({ aprobado: true });
    expect(b).toMatchObject({ aprobado: true });
    expect((a as { numero_operacion: string }).numero_operacion).not.toBe(
      (b as { numero_operacion: string }).numero_operacion,
    );
  });

  it('rechaza el cobro con un token tkn_sim_ko_*', async () => {
    await expect(pasarela.cobrar(params('tkn_sim_ko_abc'))).resolves.toEqual({
      aprobado: false,
      mensaje: MENSAJE_RECHAZO_SIMULADO,
    });
  });

  it('rechaza un token que no es del checkout simulado', async () => {
    await expect(pasarela.cobrar(params('tkn_test_real'))).resolves.toEqual({
      aprobado: false,
      mensaje: MENSAJE_TOKEN_SIMULADO_INVALIDO,
    });
  });
});
