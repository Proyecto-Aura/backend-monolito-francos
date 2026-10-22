import { Injectable } from '@nestjs/common';
import { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { DocumentoEstrategicoRepository } from '../../../domain/repositories/documento-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ListDocumentoEstrategicoQueryDto } from '../../dto/documento-estrategico-dtos/list-documento-estrategico-query.dto';

@Injectable()
export class ListarTodosDocumentosEstrategicosTiUseCase {
  constructor(
    private readonly documentoEstrategicoRepository: DocumentoEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(dto: ListDocumentoEstrategicoQueryDto) {
    const tipoModulo = await this.tipoModuloRepository.findByCodigo('TI');
    if (!tipoModulo) {
      throw new ResourceNotFoundError('Tipo de módulo TI no encontrado');
    }

    const result =
      await this.documentoEstrategicoRepository.findManyIncluyendoInactivos({
        page: dto.page,
        limit: dto.limit,
        plan_estrategico_id: dto.plan_estrategico_id,
        tipo_modulo_id: tipoModulo.id,
        search: dto.search,
      });
    const urls = new Map<number, string>(
      await Promise.all(
        result.data.map(
          async (documento) =>
            [
              documento.id,
              await this.s3Service.getPresignedUrl(
                'docs',
                documento.ruta_archivo,
              ),
            ] as const,
        ),
      ),
    );

    return { result, urls };
  }
}
