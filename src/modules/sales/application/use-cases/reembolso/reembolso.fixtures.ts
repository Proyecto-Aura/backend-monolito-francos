import { ReembolsoEntity } from '../../../domain/entities';
import { EstadoReembolso, MetodoPago } from '../../../domain/enums';
import { ReembolsoConPedido } from '../../../domain/repositories/types/reembolso-repository.types';

export const makeSolicitud = (
  overrides: {
    estado?: EstadoReembolso;
    evidencia_key?: string | null;
    motivo_cliente?: string;
    metodo_pago?: MetodoPago;
  } = {},
): ReembolsoConPedido => ({
  reembolso: new ReembolsoEntity(
    3,
    'SOL-000003',
    5,
    249,
    overrides.motivo_cliente ??
      'Entrega incompleta: faltaron 4 packs de canchita serrana.',
    overrides.evidencia_key === undefined
      ? 'reembolsos/SOL-000003/acta-recepcion.pdf'
      : overrides.evidencia_key,
    overrides.estado ?? EstadoReembolso.PENDIENTE,
    null,
    null,
    new Date('2026-10-17T15:00:00.000Z'),
    null,
    new Date('2026-10-17T15:00:00.000Z'),
    new Date('2026-10-17T15:00:00.000Z'),
  ),
  pedido_id: 9,
  pedido_codigo: 'PED-000009',
  cliente_nombre: 'Rosa Elena Quispe Huamán',
  metodo_pago: overrides.metodo_pago ?? MetodoPago.CULQI,
});
