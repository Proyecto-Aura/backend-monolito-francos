import { ClienteEntity } from '../../../domain/entities/cliente.entity';
import { PersonaEntity } from '../../../domain/entities/persona.entity';
import {
  CategoriaCliente,
  TipoCliente,
  TipoDocumento,
} from '../../../domain/enums/persons.enums';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';
import { ClienteConPersona } from '../../../domain/repositories/types/cliente-repository.types';
import { GetClienteByIdUseCase } from './get-cliente-by-id.use-case';

const fecha = new Date('2026-01-01T00:00:00.000Z');
const encontrado: ClienteConPersona = {
  cliente: new ClienteEntity(
    'c1',
    'persona-c1',
    TipoCliente.PERSONA_NATURAL,
    null,
    CategoriaCliente.MINORISTA,
    true,
    fecha,
    fecha,
  ),
  persona: new PersonaEntity(
    'persona-c1',
    'Ana',
    'Torres',
    'Vega',
    TipoDocumento.DNI,
    '12345678',
    null,
    null,
    null,
    true,
    fecha,
    fecha,
  ),
  email: null,
};

describe('GetClienteByIdUseCase', () => {
  const repository = { findByIdConPersona: jest.fn() };
  const useCase = new GetClienteByIdUseCase(
    repository as unknown as ClienteRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('devuelve el cliente con su persona', async () => {
    repository.findByIdConPersona.mockResolvedValue(encontrado);

    await expect(useCase.execute('c1')).resolves.toBe(encontrado);
    expect(repository.findByIdConPersona).toHaveBeenCalledWith('c1');
  });

  it('responde 404 si el cliente no existe', async () => {
    repository.findByIdConPersona.mockResolvedValue(null);

    await expect(useCase.execute('nada')).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
  });
});
