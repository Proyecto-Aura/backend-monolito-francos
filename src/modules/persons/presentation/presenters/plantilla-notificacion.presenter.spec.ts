import { PlantillaNotificacionEntity } from '../../domain/entities/plantilla-notificacion.entity';
import {
  PlantillaNotificacionClave,
  PlantillaNotificacionDestinatario,
} from '../../domain/enums/persons.enums';
import { PlantillaNotificacionPresenter } from './plantilla-notificacion.presenter';

describe('PlantillaNotificacionPresenter', () => {
  const fecha = new Date('2026-11-19T05:00:00Z');
  const plantilla = new PlantillaNotificacionEntity(
    'id-interno',
    PlantillaNotificacionClave.VERIFICACION_EMAIL,
    'Verificacion',
    PlantillaNotificacionDestinatario.CLIENTE,
    ['nombre', 'enlace'],
    'Hola {{nombre}}',
    '<a href="{{enlace}}">Verificar</a>',
    fecha,
  );
  const esperado = {
    clave: 'verificacion_email',
    nombre: 'Verificacion',
    destinatario: 'cliente',
    variables: ['nombre', 'enlace'],
    asunto: 'Hola {{nombre}}',
    cuerpo: '<a href="{{enlace}}">Verificar</a>',
    updated_at: fecha,
  };
  it('expone exactamente los campos publicos y conserva los placeholders', () => {
    expect(PlantillaNotificacionPresenter.toHttp(plantilla)).toEqual(esperado);
  });
  it('convierte la lista', () =>
    expect(PlantillaNotificacionPresenter.listToHttp([plantilla])).toEqual([
      esperado,
    ]));
  it('lista vacia', () =>
    expect(PlantillaNotificacionPresenter.listToHttp([])).toEqual([]));
});
