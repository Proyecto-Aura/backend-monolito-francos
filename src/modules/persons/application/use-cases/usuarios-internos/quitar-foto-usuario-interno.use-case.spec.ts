import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import { UsuarioInterno } from '../../../domain/repositories/types/usuario-interno-repository.types';
import { QuitarFotoUsuarioInternoUseCase } from './quitar-foto-usuario-interno.use-case';

describe('QuitarFotoUsuarioInternoUseCase', () => {
  const usuarios = { findById: jest.fn() };
  const personas = { update: jest.fn() };
  const useCase = new QuitarFotoUsuarioInternoUseCase(
    usuarios as unknown as UsuarioInternoRepository,
    personas as unknown as PersonaRepository,
  );
  let usuario: UsuarioInterno;

  beforeEach(() => {
    jest.resetAllMocks();
    usuario = {
      user: { id: 'usuario-1' },
      persona: { id: 'persona-1', foto_url: 'http://media.test/foto.png' },
      roles: [],
    } as unknown as UsuarioInterno;
    usuarios.findById.mockResolvedValue(usuario);
    personas.update.mockImplementation(() => {
      usuario = { ...usuario, persona: { ...usuario.persona, foto_url: null } };
      usuarios.findById.mockResolvedValue(usuario);
      return Promise.resolve(usuario.persona);
    });
  });

  it.each(['http://media.test/foto.png', null])(
    'limpia la foto y permite repetir cuando foto_url=%s',
    async (foto_url) => {
      usuario.persona.foto_url = foto_url;
      const resultado = await useCase.execute('usuario-1');
      expect(personas.update).toHaveBeenCalledWith('persona-1', {
        foto_url: null,
      });
      expect(resultado.persona.foto_url).toBeNull();
      expect(usuarios.findById).toHaveBeenNthCalledWith(2, 'usuario-1');
    },
  );

  it('devuelve 404 sin actualizar si no existe el usuario interno', async () => {
    usuarios.findById.mockResolvedValue(null);
    await expect(useCase.execute('inexistente')).rejects.toThrow(
      ResourceNotFoundError,
    );
    expect(personas.update).not.toHaveBeenCalled();
  });

  it('propaga el error al actualizar la persona', async () => {
    const error = new Error('No se pudo guardar la persona');
    personas.update.mockRejectedValue(error);
    await expect(useCase.execute('usuario-1')).rejects.toBe(error);
    expect(usuarios.findById).toHaveBeenCalledTimes(1);
  });

  it('devuelve 404 si el usuario desaparece al consultar el resultado', async () => {
    personas.update.mockResolvedValue(undefined);
    usuarios.findById
      .mockResolvedValueOnce(usuario)
      .mockResolvedValueOnce(null);
    await expect(useCase.execute('usuario-1')).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
