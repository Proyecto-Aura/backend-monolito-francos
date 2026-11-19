import { CanalNotificacionEntity } from '../../domain/entities/canal-notificacion.entity';
import { CanalNotificacionTipo } from '../../domain/enums/persons.enums';
import { CanalNotificacionPresenter } from './canal-notificacion.presenter';
import { envs } from '../../../../config/envs';

jest.mock('../../../../config/envs', () => ({
  envs: {
    smtpFrom: 'avisos@test.com',
    smtpHost: 'smtp.test.com',
    smtpSecure: true,
  },
}));

describe('CanalNotificacionPresenter', () => {
  const fecha = new Date('2026-11-19T05:00:00Z');
  beforeEach(() => {
    Object.assign(envs, {
      smtpFrom: 'avisos@test.com',
      smtpHost: 'smtp.test.com',
      smtpSecure: true,
    });
  });

  it.each([
    { smtpSecure: true, seguridad: 'TLS' },
    { smtpSecure: false, seguridad: 'STARTTLS' },
  ])(
    'expone SMTP real con smtpSecure=$smtpSecure y seguridad=$seguridad',
    ({ smtpSecure, seguridad }) => {
      envs.smtpSecure = smtpSecure;
      const canal = new CanalNotificacionEntity(
        'id-interno',
        CanalNotificacionTipo.EMAIL,
        false,
        null,
        fecha,
      );
      expect(CanalNotificacionPresenter.toHttp(canal)).toEqual({
        tipo: 'email',
        activo: false,
        remitente: 'avisos@test.com',
        servidor_smtp: 'smtp.test.com',
        seguridad,
        destinatarios: null,
        updated_at: fecha,
      });
    },
  );

  it('lee la configuracion vigente en cada llamada al presenter', () => {
    const canal = new CanalNotificacionEntity(
      'id-interno',
      CanalNotificacionTipo.EMAIL,
      true,
      null,
      fecha,
    );
    expect(CanalNotificacionPresenter.toHttp(canal)).toMatchObject({
      remitente: 'avisos@test.com',
      servidor_smtp: 'smtp.test.com',
      seguridad: 'TLS',
    });
    Object.assign(envs, {
      smtpFrom: 'otro@test.com',
      smtpHost: 'smtp.otro.test',
      smtpSecure: false,
    });
    expect(CanalNotificacionPresenter.toHttp(canal)).toMatchObject({
      remitente: 'otro@test.com',
      servidor_smtp: 'smtp.otro.test',
      seguridad: 'STARTTLS',
    });
  });
  it('lista portal y conserva campos opcionales null', () => {
    const canal = new CanalNotificacionEntity(
      'id-interno',
      CanalNotificacionTipo.PORTAL,
      true,
      'Clientes',
      fecha,
    );
    expect(CanalNotificacionPresenter.listToHttp([canal])).toEqual([
      {
        tipo: 'portal',
        activo: true,
        remitente: null,
        servidor_smtp: null,
        seguridad: null,
        destinatarios: 'Clientes',
        updated_at: fecha,
      },
    ]);
  });
  it('lista vacia', () =>
    expect(CanalNotificacionPresenter.listToHttp([])).toEqual([]));
});
