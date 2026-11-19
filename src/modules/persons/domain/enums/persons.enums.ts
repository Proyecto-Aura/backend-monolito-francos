export enum TipoDocumento {
  DNI = 'dni',
  CE = 'ce',
  PASAPORTE = 'pasaporte',
  RUC = 'ruc',
}

export enum TipoCliente {
  PERSONA_NATURAL = 'persona_natural',
  EMPRESA = 'empresa',
}

export enum CategoriaCliente {
  MINORISTA = 'minorista',
  MAYORISTA = 'mayorista',
}

export enum ReferenciaTipo {
  PEDIDO = 'pedido',
  PAGO = 'pago',
  REEMBOLSO = 'reembolso',
  PROMOCION = 'promocion',
}

export enum CanalNotificacionTipo {
  EMAIL = 'email',
  PORTAL = 'portal',
}

export enum PlantillaNotificacionClave {
  VERIFICACION_EMAIL = 'verificacion_email',
  BIENVENIDA_CLIENTE = 'bienvenida_cliente',
  CREDENCIALES_USUARIO_INTERNO = 'credenciales_usuario_interno',
  RECUPERAR_CONTRASENA = 'recuperar_contrasena',
  COMPROBANTE_EMITIDO = 'comprobante_emitido',
  PAGO_CONFIRMADO = 'pago_confirmado',
  PAGO_RECHAZADO = 'pago_rechazado',
  PEDIDO_EN_CAMINO = 'pedido_en_camino',
  REEMBOLSO_APROBADO = 'reembolso_aprobado',
  REEMBOLSO_RECHAZADO = 'reembolso_rechazado',
  REEMBOLSO_PROCESADO = 'reembolso_procesado',
}

export enum PlantillaNotificacionDestinatario {
  CLIENTE = 'cliente',
  USUARIO_INTERNO = 'usuario_interno',
  AMBOS = 'ambos',
}
