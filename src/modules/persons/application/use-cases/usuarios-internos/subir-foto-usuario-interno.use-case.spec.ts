import { S3Service } from '../../../../../infrastructure/storage/s3.service';
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import { UsuarioInterno } from '../../../domain/repositories/types/usuario-interno-repository.types';
import {
  SubirFotoUsuarioInternoUseCase,
  TAMANO_MAXIMO_FOTO_USUARIO,
} from './subir-foto-usuario-interno.use-case';

jest.mock('../../../../../config/envs', () => ({
  envs: { mediaBaseUrl: 'http://media.test/francos-media' },
}));

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const archivo = (buffer: Buffer, size = buffer.length) =>
  ({
    buffer,
    size,
    mimetype: 'application/octet-stream',
    originalname: 'foto.txt',
  }) as Express.Multer.File;

describe('SubirFotoUsuarioInternoUseCase', () => {
  const usuarios = { findById: jest.fn() };
  const personas = { update: jest.fn() };
  const s3 = { upload: jest.fn(), delete: jest.fn() };
  const useCase = new SubirFotoUsuarioInternoUseCase(
    usuarios as unknown as UsuarioInternoRepository,
    personas as unknown as PersonaRepository,
    s3 as unknown as S3Service,
  );
  let usuario: UsuarioInterno;

  beforeEach(() => {
    jest.resetAllMocks();
    usuario = {
      user: { id: 'usuario-1' },
      persona: {
        id: 'persona-1',
        foto_url: 'http://media.test/foto-anterior.png',
      },
      roles: [],
    } as unknown as UsuarioInterno;
    usuarios.findById.mockResolvedValue(usuario);
    s3.upload.mockResolvedValue(undefined);
    personas.update.mockImplementation(
      (_id: string, datos: { foto_url: string }) => {
        usuario = { ...usuario, persona: { ...usuario.persona, ...datos } };
        usuarios.findById.mockResolvedValue(usuario);
        return Promise.resolve(usuario.persona);
      },
    );
  });

  it.each([
    { buffer: PNG, extension: 'png', mime: 'image/png' },
    { buffer: JPG, extension: 'jpg', mime: 'image/jpeg' },
  ])(
    'sube $extension por su firma y devuelve la persona con la URL nueva',
    async ({ buffer, extension, mime }) => {
      const resultado = await useCase.execute('usuario-1', archivo(buffer));
      const [, key] = s3.upload.mock.calls[0] as [string, string];

      expect(key).toMatch(
        new RegExp(`^usuarios/[0-9a-f-]{36}\\.${extension}$`),
      );
      expect(s3.upload).toHaveBeenCalledWith(
        'media',
        key,
        buffer,
        mime,
        'public, max-age=31536000, immutable',
      );
      expect(personas.update).toHaveBeenCalledWith('persona-1', {
        foto_url: `http://media.test/francos-media/${key}`,
      });
      expect(resultado.persona.foto_url).toBe(
        `http://media.test/francos-media/${key}`,
      );
      expect(usuarios.findById).toHaveBeenNthCalledWith(1, 'usuario-1');
      expect(usuarios.findById).toHaveBeenNthCalledWith(2, 'usuario-1');
      expect(s3.delete).not.toHaveBeenCalled();
    },
  );

  it('acepta exactamente 1 MB', async () => {
    const buffer = Buffer.alloc(TAMANO_MAXIMO_FOTO_USUARIO);
    PNG.copy(buffer);
    await useCase.execute('usuario-1', archivo(buffer));
    expect(s3.upload).toHaveBeenCalledTimes(1);
  });

  it.each([
    Buffer.alloc(0),
    PNG.subarray(0, 7),
    JPG.subarray(0, 2),
    Buffer.from('RIFF0000WEBPVP8 '),
  ])(
    'rechaza contenido vacio, truncado o de otro formato (%j)',
    async (buffer) => {
      await expect(
        useCase.execute('usuario-1', {
          ...archivo(buffer),
          mimetype: 'image/png',
          originalname: 'foto.png',
        }),
      ).rejects.toThrow(new InvalidRequestError('La foto debe ser PNG o JPG'));
      expect(s3.upload).not.toHaveBeenCalled();
      expect(personas.update).not.toHaveBeenCalled();
    },
  );

  it('rechaza mas de 1 MB antes de subir o guardar', async () => {
    await expect(
      useCase.execute(
        'usuario-1',
        archivo(PNG, TAMANO_MAXIMO_FOTO_USUARIO + 1),
      ),
    ).rejects.toThrow(new InvalidRequestError('La foto no debe superar 1 MB'));
    expect(s3.upload).not.toHaveBeenCalled();
    expect(personas.update).not.toHaveBeenCalled();
  });

  it('devuelve 404 si no existe el usuario interno', async () => {
    usuarios.findById.mockResolvedValue(null);
    await expect(useCase.execute('inexistente', archivo(PNG))).rejects.toThrow(
      ResourceNotFoundError,
    );
    expect(s3.upload).not.toHaveBeenCalled();
    expect(personas.update).not.toHaveBeenCalled();
  });

  it('conserva la URL anterior si falla S3', async () => {
    const error = new Error('S3 no disponible');
    s3.upload.mockRejectedValue(error);
    await expect(useCase.execute('usuario-1', archivo(PNG))).rejects.toBe(
      error,
    );
    expect(personas.update).not.toHaveBeenCalled();
    expect(usuario.persona.foto_url).toBe(
      'http://media.test/foto-anterior.png',
    );
  });

  it('propaga el error de persistencia sin intentar borrar archivos', async () => {
    const error = new Error('No se pudo guardar la persona');
    personas.update.mockRejectedValue(error);
    await expect(useCase.execute('usuario-1', archivo(PNG))).rejects.toBe(
      error,
    );
    expect(usuarios.findById).toHaveBeenCalledTimes(1);
    expect(s3.delete).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el usuario desaparece al consultar el resultado', async () => {
    personas.update.mockResolvedValue(undefined);
    usuarios.findById
      .mockResolvedValueOnce(usuario)
      .mockResolvedValueOnce(null);
    await expect(useCase.execute('usuario-1', archivo(PNG))).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
