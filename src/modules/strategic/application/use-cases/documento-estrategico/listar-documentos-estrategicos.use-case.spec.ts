// El use-case real importa S3Service, que importa config/envs - sin este mock,
// la validacion de Joi de envs.ts corre al importarse y explota en CI (no hay .env).
jest.mock('../../../../../config/envs', () => ({
  envs: {},
}));

import type { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { DocumentoEstrategicoEntity } from '../../../domain/entities';
import { DocumentoEstrategicoRepository } from '../../../domain/repositories/documento-estrategico.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { ListDocumentoEstrategicoQueryDto } from '../../dto/documento-estrategico-dtos/list-documento-estrategico-query.dto';
import { ListarDocumentosEstrategicosUseCase } from './listar-documentos-estrategicos.use-case';

describe('ListarDocumentosEstrategicosUseCase', () => {
  const findMany = jest.fn();
  const documentoEstrategicoRepository = {
    findMany,
  } as unknown as jest.Mocked<DocumentoEstrategicoRepository>;

  const upload = jest.fn();
  const deleteObject = jest.fn();
  const getPresignedUrl = jest.fn();
  const s3Service = {
    upload,
    delete: deleteObject,
    getPresignedUrl,
  } as unknown as jest.Mocked<S3Service>;

  const useCase = new ListarDocumentosEstrategicosUseCase(
    documentoEstrategicoRepository,
    s3Service,
  );

  const documentoUno = {
    id: 10,
    plan_estrategico_id: 1,
    tipo_modulo_id: 7,
    nombre: 'Informe financiero',
    ruta_archivo: 'informe-financiero.pdf',
    nombre_original: 'informe.pdf',
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  } as DocumentoEstrategicoEntity;

  const documentoDos = {
    ...documentoUno,
    id: 11,
    nombre: 'Presentación comercial',
    ruta_archivo: 'presentacion-comercial.pptx',
  } as DocumentoEstrategicoEntity;

  const dto: ListDocumentoEstrategicoQueryDto = {
    page: 2,
    limit: 10,
    plan_estrategico_id: 1,
    search: 'informe',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('llama a findMany con los parámetros del DTO y devuelve las URLs presignadas', async () => {
    const result: PaginatedResult<DocumentoEstrategicoEntity> = {
      data: [documentoUno, documentoDos],
      total: 2,
      page: dto.page,
      limit: dto.limit,
    };
    findMany.mockResolvedValue(result);
    getPresignedUrl
      .mockResolvedValueOnce('https://minio.local/informe')
      .mockResolvedValueOnce('https://minio.local/presentacion');

    const response = await useCase.execute(dto);

    expect(findMany).toHaveBeenCalledWith({
      page: dto.page,
      limit: dto.limit,
      plan_estrategico_id: dto.plan_estrategico_id,
      search: dto.search,
    });
    expect(getPresignedUrl).toHaveBeenNthCalledWith(
      1,
      'docs',
      documentoUno.ruta_archivo,
    );
    expect(getPresignedUrl).toHaveBeenNthCalledWith(
      2,
      'docs',
      documentoDos.ruta_archivo,
    );
    expect(response).toEqual({
      result,
      urls: new Map([
        [documentoUno.id, 'https://minio.local/informe'],
        [documentoDos.id, 'https://minio.local/presentacion'],
      ]),
    });
  });

  it('devuelve un Map con una entrada por documento', async () => {
    const result: PaginatedResult<DocumentoEstrategicoEntity> = {
      data: [documentoUno],
      total: 1,
      page: 1,
      limit: 10,
    };
    findMany.mockResolvedValue(result);
    getPresignedUrl.mockResolvedValue('https://minio.local/documento');

    const response = await useCase.execute({
      page: 1,
      limit: 10,
      plan_estrategico_id: 1,
    });

    expect(response.urls).toEqual(
      new Map([[documentoUno.id, 'https://minio.local/documento']]),
    );
    expect(response.urls.size).toBe(result.data.length);
  });

  it('devuelve un Map vacío y no genera URLs si result.data está vacío', async () => {
    findMany.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    } satisfies PaginatedResult<DocumentoEstrategicoEntity>);

    const response = await useCase.execute({
      page: 1,
      limit: 10,
      plan_estrategico_id: 1,
    });

    expect(response.urls).toEqual(new Map());
    expect(getPresignedUrl).not.toHaveBeenCalled();
  });
});
