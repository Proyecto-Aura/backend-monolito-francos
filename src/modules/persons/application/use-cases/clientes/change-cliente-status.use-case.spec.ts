import { ClienteEntity } from '../../../domain/entities/cliente.entity';
import {
  CategoriaCliente,
  TipoCliente,
} from '../../../domain/enums/persons.enums';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';
import { ChangeClienteStatusUseCase } from './change-cliente-status.use-case';

const fecha = new Date('2026-01-01T00:00:00.000Z');
const cliente = new ClienteEntity(
  'c1',
  'persona-c1',
  TipoCliente.PERSONA_NATURAL,
  null,
  CategoriaCliente.MINORISTA,
  true,
  fecha,
  fecha,
  7,
);

describe('ChangeClienteStatusUseCase', () => {
  const repository = { findById: jest.fn(), setStatus: jest.fn() };
  const useCase = new ChangeClienteStatusUseCase(
    repository as unknown as ClienteRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('responde 404 si el cliente no existe y no cambia nada', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('nada', false)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(repository.setStatus).not.toHaveBeenCalled();
  });

  it('desactiva el cliente de forma lógica', async () => {
    repository.findById.mockResolvedValue(cliente);
    const actualizado = { cliente: { ...cliente, estado: false } };
    repository.setStatus.mockResolvedValue(actualizado);

    await expect(useCase.execute('c1', false)).resolves.toBe(actualizado);
    expect(repository.setStatus).toHaveBeenCalledWith('c1', false);
  });

  it('reactiva el cliente', async () => {
    repository.findById.mockResolvedValue({ ...cliente, estado: false });
    repository.setStatus.mockResolvedValue({ cliente });

    await useCase.execute('c1', true);

    expect(repository.setStatus).toHaveBeenCalledWith('c1', true);
  });
});
