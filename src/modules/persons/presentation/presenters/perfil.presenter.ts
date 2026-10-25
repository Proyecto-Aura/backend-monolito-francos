import { PerfilCliente } from '../../application/use-cases/perfil/get-perfil.use-case';

// Perfil del cliente (HU-B-015): lo editable y lo que se muestra en "Mi perfil".
export class PerfilPresenter {
  static toHttp({ user, persona, cliente }: PerfilCliente) {
    return {
      nombres: persona.nombres,
      apellido_paterno: persona.apellido_paterno,
      apellido_materno: persona.apellido_materno,
      email: user.email,
      telefono: persona.telefono,
      tipo_documento: persona.tipo_documento,
      numero_documento: persona.numero_documento,
      tipo_cliente: cliente?.tipo_cliente ?? null,
      razon_social: cliente?.razon_social ?? null,
    };
  }
}
