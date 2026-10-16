import { DocumentoEstrategico as PrismaDocumentoEstrategico } from '@prisma/client';
import { DocumentoEstrategicoEntity } from '../../domain/entities';

export class DocumentoEstrategicoMapper {
  static toDomain(
    documento: PrismaDocumentoEstrategico,
  ): DocumentoEstrategicoEntity {
    return new DocumentoEstrategicoEntity(
      documento.id,
      documento.plan_estrategico_id,
      documento.tipo_modulo_id,
      documento.nombre,
      documento.ruta_archivo,
      documento.nombre_original,
      documento.estado,
      documento.created_at,
      documento.updated_at,
    );
  }
}
