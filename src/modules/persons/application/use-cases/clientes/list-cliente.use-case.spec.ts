import { ClienteEntity } from '../../../domain/entities/cliente.entity';
import { PersonaEntity } from '../../../domain/entities/persona.entity';
import {
  CategoriaCliente,
  TipoCliente,
  TipoDocumento,
} from '../../../domain/enums/persons.enums';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';
import { ClienteConPersona } from '../../../domain/repositories/types/cliente-repository.types';
import { ListClientesQueryDto } from '../../dto/cliente-dtos/list-clientes-query.dto';
import { ListClientesUseCase } from './list-cliente.use-case';

const fecha = new Date('2026-01-01T00:00:00.000Z');
const clienteConPersona = (id: string): ClienteConPersona => ({
  cliente: new ClienteEntity(
    id,
    `persona-${id}`,
    TipoCliente.PERSONA_NATURAL,
    null,
    CategoriaCliente.MINORISTA,
    true,
    fecha,
    fecha,
  ),
  persona: new PersonaEntity(
    `persona-${id}`,
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
  email: 'ana@francos.test',
});

describe('ListClientesUseCase', () => {
  const repository = { findManyConPersona: jest.fn() };
  const useCase = new ListClientesUseCase(
    repository as unknown as ClienteRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('pasa los filtros y la paginación al repositorio', async () => {
    repository.findManyConPersona.mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      limit: 5,
    });
    const dto = {
      page: 2,
      limit: 5,
      search: 'ana',
      estado: true,
      tipo_cliente: 'persona_natural',
      categoria_cliente: 'minorista',
    } as ListClientesQueryDto;

    await useCase.execute(dto);

    expect(repository.findManyConPersona).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      search: 'ana',
      estado: true,
      tipo_cliente: 'persona_natural',
      categoria_cliente: 'minorista',
    });
  });

  it('devuelve lo que entrega el repositorio, con los datos de persona', async () => {
    const resultado = {
      data: [clienteConPersona('c1')],
      total: 1,
      page: 1,
      limit: 10,
    };
    repository.findManyConPersona.mockResolvedValue(resultado);

    await expect(useCase.execute({ page: 1, limit: 10 })).resolves.toBe(
      resultado,
    );
  });
});
