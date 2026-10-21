import { Injectable } from '@nestjs/common';
import { S3Service } from '../../../../../infrastructure/storage/s3.service';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { DocumentoEstrategicoRepository } from '../../../domain/repositories/documento-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';

@Injectable()
export class EliminarDocumentoEstrategicoTiUseCase {
  constructor(
    private readonly documentoEstrategicoRepository: DocumentoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(id: number): Promise<void> {
    const documento =
      await this.documentoEstrategicoRepository.findActivoById(id);
    const tipoModulo = await this.tipoModuloRepository.findByCodigo('TI');

    if (
      !documento ||
      !tipoModulo ||
      documento.tipo_modulo_id !== tipoModulo.id
    ) {
      throw new ResourceNotFoundError('Documento estratégico no encontrado');
    }

    const plan = await this.planEstrategicoRepository.findActivoById(
      documento.plan_estrategico_id,
    );
    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }
    if (plan.estado_plan.codigo !== 'BORRADOR') {
      throw new ResourceConflictError(
        'Solo se pueden eliminar documentos cuando el plan está en Borrador',
      );
    }

    await this.s3Service.delete('docs', documento.ruta_archivo);
    await this.documentoEstrategicoRepository.deleteById(id);
  }
}
