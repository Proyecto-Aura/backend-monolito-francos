import { CanalNotificacionEntity } from '../../../domain/entities/canal-notificacion.entity';
import { PlantillaNotificacionEntity } from '../../../domain/entities/plantilla-notificacion.entity';
import {
  CanalNotificacionTipo as Canal,
  PlantillaNotificacionClave as Clave,
  PlantillaNotificacionDestinatario as Destinatario,
} from '../../../domain/enums/persons.enums';
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { CanalNotificacionRepository } from '../../../domain/repositories/canal-notificacion.repository';
import { PlantillaNotificacionRepository } from '../../../domain/repositories/plantilla-notificacion.repository';
import { ListCanalesNotificacionUseCase } from './list-canales-notificacion.use-case';
import { UpdateCanalNotificacionUseCase } from './update-canal-notificacion.use-case';
import { ListPlantillasNotificacionUseCase } from './list-plantillas-notificacion.use-case';
import { GetPlantillaNotificacionByClaveUseCase } from './get-plantilla-notificacion-by-clave.use-case';
import { UpdatePlantillaNotificacionUseCase } from './update-plantilla-notificacion.use-case';

describe('Parametros de notificaciones', () => {
  const canales = {
    findAll: jest.fn(),
    findByTipo: jest.fn(),
    update: jest.fn(),
  } satisfies jest.Mocked<CanalNotificacionRepository>;
  const plantillas = {
    findAll: jest.fn(),
    findByClave: jest.fn(),
    update: jest.fn(),
  } satisfies jest.Mocked<PlantillaNotificacionRepository>;
  const fecha = new Date('2026-11-19T05:00:00Z');
  const canal = new CanalNotificacionEntity(
    'canal-1',
    Canal.EMAIL,
    true,
    null,
    fecha,
  );
  const plantilla = new PlantillaNotificacionEntity(
    'plantilla-1',
    Clave.VERIFICACION_EMAIL,
    'Verificacion',
    Destinatario.CLIENTE,
    ['nombre', 'enlace'],
    'Hola {{nombre}}',
    '<a href="{{enlace}}">{{nombre}}</a>',
    fecha,
  );
  const listarCanales = new ListCanalesNotificacionUseCase(canales);
  const actualizarCanal = new UpdateCanalNotificacionUseCase(canales);
  const listarPlantillas = new ListPlantillasNotificacionUseCase(plantillas);
  const obtenerPlantilla = new GetPlantillaNotificacionByClaveUseCase(
    plantillas,
  );
  const actualizarPlantilla = new UpdatePlantillaNotificacionUseCase(
    plantillas,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    canales.findByTipo.mockResolvedValue(canal);
    plantillas.findByClave.mockResolvedValue(plantilla);
  });

  describe('ListCanalesNotificacionUseCase', () => {
    it.each([{ lista: [] }, { lista: [canal] }])(
      'devuelve la lista del repositorio: %j',
      async ({ lista }) => {
        canales.findAll.mockResolvedValue(lista);
        await expect(listarCanales.execute()).resolves.toBe(lista);
        expect(canales.findAll).toHaveBeenCalledWith();
      },
    );
  });

  describe('UpdateCanalNotificacionUseCase', () => {
    it('actualiza todos los campos y devuelve el canal actualizado', async () => {
      const dto = {
        activo: false,
        destinatarios: 'Clientes',
      };
      const actualizado = { ...canal, ...dto };
      canales.update.mockResolvedValue(actualizado);
      await expect(actualizarCanal.execute(Canal.EMAIL, dto)).resolves.toBe(
        actualizado,
      );
      expect(canales.findByTipo).toHaveBeenCalledWith(Canal.EMAIL);
      expect(canales.update).toHaveBeenCalledWith(Canal.EMAIL, dto);
    });
    it.each([
      {},
      { activo: false },
      { activo: true },
      { destinatarios: 'Clientes del portal' },
    ])('propaga PATCH parcial %j', async (dto) => {
      await actualizarCanal.execute(Canal.PORTAL, dto);
      expect(canales.update).toHaveBeenCalledWith(Canal.PORTAL, dto);
    });
    it('devuelve 404 cuando falta la fila del canal', async () => {
      canales.findByTipo.mockResolvedValue(null);
      await expect(
        actualizarCanal.execute(Canal.EMAIL, { activo: false }),
      ).rejects.toBeInstanceOf(ResourceNotFoundError);
      expect(canales.update).not.toHaveBeenCalled();
    });
  });

  describe('ListPlantillasNotificacionUseCase', () => {
    it.each([{ lista: [] }, { lista: [plantilla] }])(
      'devuelve la lista del repositorio: %j',
      async ({ lista }) => {
        plantillas.findAll.mockResolvedValue(lista);
        await expect(listarPlantillas.execute()).resolves.toBe(lista);
        expect(plantillas.findAll).toHaveBeenCalledWith();
      },
    );
  });

  describe('GetPlantillaNotificacionByClaveUseCase', () => {
    it('busca la clave y devuelve la entidad', async () => {
      await expect(
        obtenerPlantilla.execute(Clave.VERIFICACION_EMAIL),
      ).resolves.toBe(plantilla);
      expect(plantillas.findByClave).toHaveBeenCalledWith(
        Clave.VERIFICACION_EMAIL,
      );
    });
    it('devuelve 404 cuando falta la fila de la plantilla', async () => {
      plantillas.findByClave.mockResolvedValue(null);
      await expect(
        obtenerPlantilla.execute(Clave.VERIFICACION_EMAIL),
      ).rejects.toBeInstanceOf(ResourceNotFoundError);
    });
  });

  describe('UpdatePlantillaNotificacionUseCase', () => {
    it.each([
      {},
      { asunto: 'Texto sin variables' },
      { asunto: 'Hola {{nombre}}', cuerpo: '<p>{{enlace}}</p>' },
      { asunto: '{{ nombre }} {{nombre}}' },
      { cuerpo: '<p>{{ nombre }}: {{ enlace }}</p>' },
    ])('acepta variables validas o texto sin placeholders: %j', async (dto) => {
      const actualizada = { ...plantilla, ...dto };
      plantillas.update.mockResolvedValue(actualizada);
      await expect(
        actualizarPlantilla.execute(Clave.VERIFICACION_EMAIL, dto),
      ).resolves.toBe(actualizada);
      expect(plantillas.update).toHaveBeenCalledWith(
        Clave.VERIFICACION_EMAIL,
        dto,
      );
    });
    it.each([
      { asunto: '{{inventada}}' },
      { cuerpo: '{{inventada}}' },
      { asunto: '{{nombre}} {{inventada}}' },
      { cuerpo: '{{enlace}} {{inventada}}' },
      { asunto: '{{NOMBRE}}' },
      { asunto: '{{nombre}}', cuerpo: '{{otra_variable}}' },
    ])('rechaza variables desconocidas sin escribir: %j', async (dto) => {
      await expect(
        actualizarPlantilla.execute(Clave.VERIFICACION_EMAIL, dto),
      ).rejects.toBeInstanceOf(InvalidRequestError);
      expect(plantillas.update).not.toHaveBeenCalled();
    });
    it('la validacion usa las variables de esa plantilla', async () => {
      await expect(
        actualizarPlantilla.execute(Clave.VERIFICACION_EMAIL, {
          asunto: '{{codigo}}',
        }),
      ).rejects.toThrow('Variables no válidas');
      expect(plantillas.update).not.toHaveBeenCalled();
    });
    it('devuelve 404 sin intentar actualizar si falta la plantilla', async () => {
      plantillas.findByClave.mockResolvedValue(null);
      await expect(
        actualizarPlantilla.execute(Clave.VERIFICACION_EMAIL, {
          asunto: 'Nuevo',
        }),
      ).rejects.toBeInstanceOf(ResourceNotFoundError);
      expect(plantillas.update).not.toHaveBeenCalled();
    });
  });
});
