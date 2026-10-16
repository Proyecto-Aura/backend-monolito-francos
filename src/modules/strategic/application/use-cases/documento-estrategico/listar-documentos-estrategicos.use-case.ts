import { Injectable } from '@nestjs/common';
import { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { DocumentoEstrategicoRepository } from '../../../domain/repositories/documento-estrategico.repository';
import { ListDocumentoEstrategicoQueryDto } from '../../dto/documento-estrategico-dtos/list-documento-estrategico-query.dto';

@Injectable()
export class ListarDocumentosEstrategicosUseCase {
  constructor(
    private readonly documentoEstrategicoRepository: DocumentoEstrategicoRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(dto: ListDocumentoEstrategicoQueryDto) {
    const result = await this.documentoEstrategicoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      plan_estrategico_id: dto.plan_estrategico_id,
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
