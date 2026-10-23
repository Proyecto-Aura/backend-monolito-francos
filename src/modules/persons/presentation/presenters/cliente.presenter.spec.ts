import { ClienteEntity } from '../../domain/entities/cliente.entity';
import { PersonaEntity } from '../../domain/entities/persona.entity';
import {
  CategoriaCliente,
  TipoCliente,
  TipoDocumento,
} from '../../domain/enums/persons.enums';
import { ClienteConPersona } from '../../domain/repositories/types/cliente-repository.types';
import { ClientePresenter } from './cliente.presenter';

describe('ClientePresenter', () => {
  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const nacimiento = new Date('1990-03-20T00:00:00.000Z');
  const item = (email: string | null): ClienteConPersona => ({
    cliente: new ClienteEntity(
      'c1',
      'p1',
      TipoCliente.EMPRESA,
      'Distribuidora El Sol S.A.C.',
      CategoriaCliente.MAYORISTA,
      true,
      fecha,
      fecha,
    ),
    persona: new PersonaEntity(
      'p1',
      'Ana',
      'Torres',
      'Vega',
      TipoDocumento.DNI,
      '12345678',
      '987654321',
      nacimiento,
      'Av. Los Girasoles 123',
      true,
      fecha,
      fecha,
    ),
    email,
  });

  it('conserva los campos del cliente y agrega los de la persona y el correo', () => {
    expect(ClientePresenter.toHttp(item('ana@francos.test'))).toEqual({
      id: 'c1',
      persona_id: 'p1',
      tipo_cliente: 'empresa',
      razon_social: 'Distribuidora El Sol S.A.C.',
      categoria_cliente: 'mayorista',
      estado: true,
      created_at: fecha,
      updated_at: fecha,
      nombres: 'Ana',
      apellido_paterno: 'Torres',
      apellido_materno: 'Vega',
      tipo_documento: 'dni',
      numero_documento: '12345678',
      telefono: '987654321',
      fecha_nacimiento: nacimiento,
      direccion: 'Av. Los Girasoles 123',
      email: 'ana@francos.test',
    });
  });

  it('devuelve email null cuando el cliente no tiene cuenta', () => {
    expect(ClientePresenter.toHttp(item(null)).email).toBeNull();
  });

  it('arma la respuesta paginada con el total de páginas', () => {
    const respuesta = ClientePresenter.paginatedToHttp({
      data: [item(null), item(null)],
      total: 25,
      page: 2,
      limit: 10,
    });

    expect(respuesta.data).toHaveLength(2);
    expect(respuesta.meta).toEqual({
      total: 25,
      page: 2,
      limit: 10,
      total_pages: 3,
    });
  });
});
