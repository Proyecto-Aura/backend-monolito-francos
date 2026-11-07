// Pendiente: recien creada, produccion la puede rechazar (su "cancelar").
// En_proceso/Entregado: solo inventario las mueve (es quien maneja insumos y
// lotes). Rechazado solo se alcanza desde Pendiente, mismo criterio que
// solicitud de produccion pero con los roles invertidos.
export enum EstadoSolicitudInsumos {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  ENTREGADO = 'entregado',
  RECHAZADO = 'rechazado',
}
