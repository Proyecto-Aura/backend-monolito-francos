import { Injectable } from '@nestjs/common';
import { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { DocumentoEstrategicoEntity } from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { DocumentoEstrategicoRepository } from '../../../domain/repositories/documento-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';

@Injectable()
export class ObtenerDocumentoEstrategicoTiByIdUseCase {
  constructor(
    private readonly documentoEstrategicoRepository: DocumentoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(
    id: number,
  ): Promise<{ documento: DocumentoEstrategicoEntity; url: string }> {
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

    const url = await this.s3Service.getPresignedUrl(
      'docs',
      documento.ruta_archivo,
    );

    return { documento, url };
  }
}
