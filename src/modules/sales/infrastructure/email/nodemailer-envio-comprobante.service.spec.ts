const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));
jest.mock('../../../../config/envs', () => ({
  envs: { smtpFrom: 'avisos@test.com', smtpHost: 'localhost', smtpPort: 1025 },
}));

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { TipoComprobante } from '../../domain/enums/sales.enums';
import { EnvioComprobanteParams } from '../../domain/services/envio-comprobante.service';
import { NodemailerEnvioComprobanteService } from './nodemailer-envio-comprobante.service';

describe('NodemailerEnvioComprobanteService', () => {
  const findUnique = jest.fn();
  const prisma = {
    canalNotificacion: { findUnique },
  } as unknown as PrismaService;
  const params: EnvioComprobanteParams = {
    to: 'ana@test.com',
    cliente_nombre: 'Ana',
    pedido_codigo: 'PED-1',
    emisor: {
      razon_social: 'Franco SAC',
      ruc: '20100047218',
      direccion: 'Lima',
    },
    comprobante: {
      id: 1,
      pago_id: 1,
      tipo: TipoComprobante.BOLETA,
      serie: 'B001',
      numero: 15,
      ruc: null,
      razon_social: null,
      subtotal: 10,
      total: 10,
      created_at: new Date('2026-11-19T05:00:00Z'),
    },
    lineas: [
      {
        producto: 'Chifle',
        presentacion: '250 g',
        cantidad: 1,
        precio_aplicado: 10,
        subtotal: 10,
      },
    ],
  };
  beforeEach(() => {
    findUnique.mockReset().mockResolvedValue({ activo: true });
    mockSendMail.mockReset().mockResolvedValue(undefined);
  });
  it('envia el comprobante si email esta activo', async () => {
    await new NodemailerEnvioComprobanteService(prisma).enviar(params);
    expect(findUnique).toHaveBeenCalledWith({ where: { tipo: 'email' } });
    const [mensaje] = mockSendMail.mock.calls[0] as [
      { from: string; to: string; subject: string; html: string },
    ];
    expect(mensaje.from).toBe('avisos@test.com');
    expect(mensaje.to).toBe(params.to);
    expect(mensaje.subject).toContain('B001-00000015');
    expect(mensaje.html).toContain('Chifle');
  });
  it('no envia ni lanza error si email esta apagado', async () => {
    findUnique.mockResolvedValue({ activo: false });
    await expect(
      new NodemailerEnvioComprobanteService(prisma).enviar(params),
    ).resolves.toBeUndefined();
    expect(mockSendMail).not.toHaveBeenCalled();
  });
  it('relee el canal en cada envio', async () => {
    findUnique
      .mockResolvedValueOnce({ activo: false })
      .mockResolvedValueOnce({ activo: true });
    const service = new NodemailerEnvioComprobanteService(prisma);
    await service.enviar(params);
    expect(mockSendMail).not.toHaveBeenCalled();
    await service.enviar(params);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
  it('conserva el comportamiento de envio si falta la fila del canal', async () => {
    findUnique.mockResolvedValue(null);
    await new NodemailerEnvioComprobanteService(prisma).enviar(params);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
  it('propaga un error SMTP', async () => {
    const error = new Error('SMTP caido');
    mockSendMail.mockRejectedValue(error);
    await expect(
      new NodemailerEnvioComprobanteService(prisma).enviar(params),
    ).rejects.toBe(error);
  });
});
