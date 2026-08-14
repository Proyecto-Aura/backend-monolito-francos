import { Empresa as PrismaEmpresa } from '@prisma/client';
import { EmpresaEntity } from '../../domain/entities/empresa.entity';

export class EmpresaMapper {
  static toDomain(empresa: PrismaEmpresa): EmpresaEntity {
    return new EmpresaEntity(
      empresa.id,
      empresa.razon_social,
      empresa.ruc,
      empresa.direccion,
      empresa.telefono,
      empresa.email,
      empresa.logo_url,
      empresa.estado,
      empresa.created_at,
      empresa.updated_at,
    );
  }
}
