import { TipoComprobante } from '../../domain/enums/sales.enums';
import { EnvioComprobanteParams } from '../../domain/services/envio-comprobante.service';
import { plantillaComprobante } from './comprobante-email.template';

describe('plantillaComprobante (RF-B31)', () => {
  const params = (
    overrides: Partial<EnvioComprobanteParams['comprobante']> = {},
  ): EnvioComprobanteParams => ({
    to: 'ana@francos.test',
    cliente_nombre: 'Ana Torres',
    pedido_codigo: 'PED-000001',
    emisor: {
      razon_social: "Franco's S.A.C.",
      ruc: '20100047218',
      direccion: 'Av. Industrial 123, Lima',
    },
    comprobante: {
      id: 7,
      pago_id: 3,
      tipo: TipoComprobante.BOLETA,
      serie: 'B001',
      numero: 15,
      ruc: null,
      razon_social: null,
      subtotal: 165.6,
      total: 165.6,
      created_at: new Date('2026-11-10T15:00:00Z'),
      ...overrides,
    },
    lineas: [
      {
        producto: 'Chifle salado',
        presentacion: '250 g',
        cantidad: 30,
        precio_aplicado: 4.2,
        subtotal: 126,
      },
    ],
  });

  it('arma la boleta con su número de 8 dígitos, el emisor, el cliente, el detalle y el total', () => {
    const { subject, html } = plantillaComprobante(params());

    expect(subject).toBe("Tu boleta de venta B001-00000015 — Franco's");
    expect(html).toContain('Boleta de venta B001-00000015');
    expect(html).toContain('RUC 20100047218');
    expect(html).toContain('<b>Cliente:</b> Ana Torres');
    expect(html).toContain('PED-000001');
    expect(html).toContain('Chifle salado · 250 g');
    expect(html).toContain('S/ 4.20');
    expect(html).toContain('<b>Total: S/ 165.60</b>');
    expect(html).toContain('10/11/2026');
  });

  it('en la factura pone la razón social y el RUC del cliente', () => {
    const { subject, html } = plantillaComprobante(
      params({
        tipo: TipoComprobante.FACTURA,
        serie: 'F001',
        numero: 1,
        ruc: '20601234565',
        razon_social: 'Distribuidora Andina S.A.C.',
      }),
    );

    expect(subject).toBe("Tu factura F001-00000001 — Franco's");
    expect(html).toContain('<b>Cliente:</b> Distribuidora Andina S.A.C.');
    expect(html).toContain('<b>RUC:</b> 20601234565');
  });

  it('escapa el texto que escribe el cliente', () => {
    const { html } = plantillaComprobante({
      ...params({
        tipo: TipoComprobante.FACTURA,
        ruc: '20601234565',
        razon_social: '<script>alert(1)</script>',
      }),
      cliente_nombre: 'Ana <b>',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Ana &lt;b&gt;');
  });
});
