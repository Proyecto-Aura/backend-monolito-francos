import { codigoComprobante } from '../../application/utils/comprobante.utils';
import { TipoComprobante } from '../../domain/enums/sales.enums';
import { EnvioComprobanteParams } from '../../domain/services/envio-comprobante.service';

const ENTIDADES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
};

// Todo lo que escribe el cliente o el personal se escapa antes de ir al HTML.
function escapar(valor: string): string {
  return valor.replace(/[&<>'"]/g, (caracter) => ENTIDADES[caracter]);
}

function soles(monto: number): string {
  return `S/ ${monto.toFixed(2)}`;
}

function fecha(valor: Date): string {
  return valor.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Lima',
  });
}

const CELDA = 'padding:6px 8px;border-bottom:1px solid #E0E0E0';

// Correo con la boleta o factura del pedido (RF-B31). Lleva los datos del
// emisor, del cliente, el detalle y los montos copiados al emitir.
export function plantillaComprobante(params: EnvioComprobanteParams): {
  subject: string;
  html: string;
} {
  const { comprobante, emisor } = params;
  const esFactura = comprobante.tipo === TipoComprobante.FACTURA;
  const titulo = esFactura ? 'Factura' : 'Boleta de venta';
  const codigo = codigoComprobante(comprobante.serie, comprobante.numero);

  const cliente =
    esFactura && comprobante.ruc && comprobante.razon_social
      ? `<p><b>Cliente:</b> ${escapar(comprobante.razon_social)}<br><b>RUC:</b> ${escapar(comprobante.ruc)}</p>`
      : `<p><b>Cliente:</b> ${escapar(params.cliente_nombre)}</p>`;

  const filas = params.lineas
    .map(
      (linea) =>
        `<tr><td style="${CELDA}">${escapar(linea.producto)} · ${escapar(linea.presentacion)}</td>` +
        `<td style="${CELDA};text-align:right">${linea.cantidad}</td>` +
        `<td style="${CELDA};text-align:right">${soles(linea.precio_aplicado)}</td>` +
        `<td style="${CELDA};text-align:right">${soles(linea.subtotal)}</td></tr>`,
    )
    .join('');

  const html =
    `<div style="font-family:Arial,sans-serif;color:#1F1F1F;max-width:600px">` +
    `<p>Hola ${escapar(params.cliente_nombre)}, gracias por tu compra. Este es el comprobante de tu pedido ${escapar(params.pedido_codigo)}.</p>` +
    `<h2 style="margin:16px 0 4px">${titulo} ${codigo}</h2>` +
    `<p style="margin:0 0 12px;color:#757575">Fecha de emisión: ${fecha(comprobante.created_at)}</p>` +
    `<p><b>${escapar(emisor.razon_social)}</b><br>RUC ${escapar(emisor.ruc)}<br>${escapar(emisor.direccion)}</p>` +
    cliente +
    `<table style="width:100%;border-collapse:collapse;font-size:14px">` +
    `<thead><tr><th style="${CELDA};text-align:left">Producto</th><th style="${CELDA};text-align:right">Cant.</th>` +
    `<th style="${CELDA};text-align:right">Precio</th><th style="${CELDA};text-align:right">Importe</th></tr></thead>` +
    `<tbody>${filas}</tbody></table>` +
    `<p style="text-align:right">Subtotal: ${soles(comprobante.subtotal)}<br><b>Total: ${soles(comprobante.total)}</b></p>` +
    `</div>`;

  return { subject: `Tu ${titulo.toLowerCase()} ${codigo} — Franco's`, html };
}
