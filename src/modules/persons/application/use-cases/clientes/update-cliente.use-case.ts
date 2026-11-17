import { Injectable } from '@nestjs/common';
import {
  CategoriaCliente,
  TipoCliente,
  TipoDocumento,
} from '../../../domain/enums/persons.enums';
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { UpdateClienteDto } from '../../dto/cliente-dtos/update-cliente.dto';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';
import { UbigeoRepository } from '../../../domain/repositories/ubigeo.repository';

@Injectable()
export class UpdateClienteUseCase {
  constructor(
    private readonly clienteRepository: ClienteRepository,
    private readonly personaRepository: PersonaRepository,
    private readonly ubigeoRepository: UbigeoRepository,
  ) {}
  async execute(id: string, dto: UpdateClienteDto) {
    // validaciones de cliente
    const cliente = await this.clienteRepository.findById(id);
    if (!cliente) {
      throw new ResourceNotFoundError('Cliente no encontrado');
    }
    const persona = await this.personaRepository.findById(cliente.persona_id);
    if (!persona) {
      throw new ResourceNotFoundError('Persona no encontrada');
    }

    // validaciones del documento de la persona
    if (
      dto.numero_documento &&
      dto.numero_documento !== persona.numero_documento &&
      (await this.personaRepository.existsByDocument(
        dto.numero_documento,
        persona.id,
      ))
    ) {
      throw new ResourceConflictError(
        'Ya existe una persona con ese número de documento',
      );
    }

    // el distrito debe existir en el catálogo de ubicación
    if (
      dto.distrito_id !== undefined &&
      !(await this.ubigeoRepository.existsDistrito(dto.distrito_id))
    ) {
      throw new InvalidRequestError('El distrito indicado no existe');
    }

    const { tipo_cliente, razon_social, categoria_cliente, ...dataPersona } =
      dto;

    // validacion del tipo de cliente y razon social
    if (
      tipo_cliente &&
      (tipo_cliente as TipoCliente) === TipoCliente.EMPRESA &&
      razon_social === undefined &&
      cliente.razon_social == null
    ) {
      throw new ResourceConflictError(
        'La razón social es obligatoria para un cliente empresa',
      );
    }

    return this.clienteRepository.updateWithPersona(id, {
      persona_id: cliente.persona_id,
      persona: {
        ...dataPersona,
        tipo_documento: dataPersona.tipo_documento as TipoDocumento | undefined,
        fecha_nacimiento: dataPersona.fecha_nacimiento
          ? new Date(dataPersona.fecha_nacimiento)
          : undefined,
      },
      cliente: {
        tipo_cliente: tipo_cliente as TipoCliente | undefined,
        razon_social:
          (tipo_cliente as TipoCliente | undefined) ===
          TipoCliente.PERSONA_NATURAL
            ? null
            : razon_social,
        categoria_cliente: categoria_cliente as CategoriaCliente | undefined,
      },
    });
  }
}
