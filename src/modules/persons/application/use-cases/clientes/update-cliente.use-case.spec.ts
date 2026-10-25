import { ClienteEntity } from '../../../domain/entities/cliente.entity';
import { PersonaEntity } from '../../../domain/entities/persona.entity';
import {
  CategoriaCliente,
  TipoCliente,
  TipoDocumento,
} from '../../../domain/enums/persons.enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';
import { UpdateClienteDto } from '../../dto/cliente-dtos/update-cliente.dto';
import { UpdateClienteUseCase } from './update-cliente.use-case';

const fecha = new Date('2026-01-01T00:00:00.000Z');
const clienteNatural = new ClienteEntity(
  'c1',
  'p1',
  TipoCliente.PERSONA_NATURAL,
  null,
  CategoriaCliente.MINORISTA,
  true,
  fecha,
  fecha,
);
const persona = new PersonaEntity(
  'p1',
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
);

describe('UpdateClienteUseCase', () => {
  const clienteRepository = {
    findById: jest.fn(),
    updateWithPersona: jest.fn(),
  };
  const personaRepository = {
    findById: jest.fn(),
    existsByDocument: jest.fn(),
  };
  const useCase = new UpdateClienteUseCase(
    clienteRepository as unknown as ClienteRepository,
    personaRepository as unknown as PersonaRepository,
  );
  const dto = (campos: Record<string, unknown>) => campos as UpdateClienteDto;

  beforeEach(() => {
    jest.clearAllMocks();
    clienteRepository.findById.mockResolvedValue(clienteNatural);
    personaRepository.findById.mockResolvedValue(persona);
    personaRepository.existsByDocument.mockResolvedValue(false);
    clienteRepository.updateWithPersona.mockResolvedValue({
      cliente: clienteNatural,
      persona,
      email: null,
    });
  });

  it('responde 404 si el cliente no existe', async () => {
    clienteRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('nada', dto({}))).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(clienteRepository.updateWithPersona).not.toHaveBeenCalled();
  });

  it('responde 404 si la persona del cliente no existe', async () => {
    personaRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('c1', dto({}))).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
  });

  it('responde 409 si el número de documento ya lo tiene otra persona', async () => {
    personaRepository.existsByDocument.mockResolvedValue(true);

    await expect(
      useCase.execute(
        'c1',
        dto({ tipo_documento: 'dni', numero_documento: '87654321' }),
      ),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(personaRepository.existsByDocument).toHaveBeenCalledWith(
      '87654321',
      'p1',
    );
  });

  it('no consulta duplicados si el documento no cambia', async () => {
    await useCase.execute(
      'c1',
      dto({ tipo_documento: 'dni', numero_documento: '12345678' }),
    );

    expect(personaRepository.existsByDocument).not.toHaveBeenCalled();
    expect(clienteRepository.updateWithPersona).toHaveBeenCalled();
  });

  it('responde 409 si pasa a empresa sin razón social', async () => {
    await expect(
      useCase.execute('c1', dto({ tipo_cliente: 'empresa' })),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(clienteRepository.updateWithPersona).not.toHaveBeenCalled();
  });

  it('acepta pasar a empresa si envía la razón social', async () => {
    await useCase.execute(
      'c1',
      dto({ tipo_cliente: 'empresa', razon_social: 'Distribuidora El Sol' }),
    );

    expect(clienteRepository.updateWithPersona).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        cliente: expect.objectContaining({
          tipo_cliente: 'empresa',
          razon_social: 'Distribuidora El Sol',
        }) as unknown,
      }),
    );
  });

  it('borra la razón social al pasar a persona natural', async () => {
    await useCase.execute(
      'c1',
      dto({ tipo_cliente: 'persona_natural', razon_social: 'Se ignora' }),
    );

    expect(clienteRepository.updateWithPersona).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        cliente: expect.objectContaining({ razon_social: null }) as unknown,
      }),
    );
  });

  it('separa los datos de persona y de cliente, y convierte la fecha', async () => {
    const resultado = await useCase.execute(
      'c1',
      dto({
        telefono: '987654321',
        fecha_nacimiento: '1990-03-20',
        categoria_cliente: 'mayorista',
      }),
    );

    expect(clienteRepository.updateWithPersona).toHaveBeenCalledWith('c1', {
      persona_id: 'p1',
      persona: {
        telefono: '987654321',
        tipo_documento: undefined,
        fecha_nacimiento: new Date('1990-03-20'),
      },
      cliente: {
        tipo_cliente: undefined,
        razon_social: undefined,
        categoria_cliente: 'mayorista',
      },
    });
    expect(resultado).toEqual({
      cliente: clienteNatural,
      persona,
      email: null,
    });
  });
});
