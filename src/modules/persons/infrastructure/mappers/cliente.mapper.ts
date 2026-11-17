import { Cliente as PrismaCliente } from '@prisma/client';
import { ClienteEntity } from '../../domain/entities/cliente.entity';
import {
  CategoriaCliente,
  TipoCliente,
} from '../../domain/enums/persons.enums';

export class ClienteMapper {
  static toDomain(cliente: PrismaCliente): ClienteEntity {
    return new ClienteEntity(
      cliente.id,
      cliente.persona_id,
      cliente.tipo_cliente as TipoCliente,
      cliente.razon_social,
      cliente.categoria_cliente as CategoriaCliente,
      cliente.estado,
      cliente.created_at,
      cliente.updated_at,
      cliente.codigo,
    );
  }
}
