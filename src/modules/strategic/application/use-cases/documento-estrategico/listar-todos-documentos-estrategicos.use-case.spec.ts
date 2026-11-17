// El use-case real importa S3Service, que importa config/envs - sin este mock,
// la validacion de Joi de envs.ts corre al importarse y explota en CI (no hay .env).
jest.mock('../../../../../config/envs', () => ({
  envs: {},
}));

import type { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { DocumentoEstrategicoEntity } from '../../../domain/entities';
import { DocumentoEstrategicoRepository } from '../../../domain/repositories/documento-estrategico.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { ListDocumentoEstrategicoQueryDto } from '../../dto/documento-estrategico-dtos/list-documento-estrategico-query.dto';
import { ListarTodosDocumentosEstrategicosUseCase } from './listar-todos-documentos-estrategicos.use-case';

describe('ListarTodosDocumentosEstrategicosUseCase', () => {
  const findManyIncluyendoInactivos = jest.fn();
  const documentoEstrategicoRepository = {
    findManyIncluyendoInactivos,
  } as unknown as jest.Mocked<DocumentoEstrategicoRepository>;

  const findTipoModuloByCodigo = jest.fn();
  const tipoModuloRepository = {
    findByCodigo: findTipoModuloByCodigo,
  } as unknown as jest.Mocked<TipoModuloRepository>;

  const upload = jest.fn();
  const deleteObject = jest.fn();
  const getPresignedUrl = jest.fn();
  const s3Service = {
    upload,
    delete: deleteObject,
    getPresignedUrl,
  } as unknown as jest.Mocked<S3Service>;

  const useCase = new ListarTodosDocumentosEstrategicosUseCase(
    documentoEstrategicoRepository,
    tipoModuloRepository,
    s3Service,
  );

  const tipoModulo = { id: 7, codigo: 'NEG', estado: true };

  const documento = {
    id: 20,
    plan_estrategico_id: 1,
    tipo_modulo_id: 7,
    nombre: 'Documento histórico',
    ruta_archivo: 'documento-historico.pdf',
    nombre_original: 'historico.pdf',
    estado: false,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  } as DocumentoEstrategicoEntity;

  const dto: ListDocumentoEstrategicoQueryDto = {
    page: 1,
    limit: 20,
    plan_estrategico_id: 1,
    search: 'histórico',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
  });

  it('llama a findManyIncluyendoInactivos con los parámetros del DTO y devuelve URLs', async () => {
    const result: PaginatedResult<DocumentoEstrategicoEntity> = {
      data: [documento],
      total: 1,
      page: dto.page,
      limit: dto.limit,
    };
    findManyIncluyendoInactivos.mockResolvedValue(result);
    getPresignedUrl.mockResolvedValue('https://minio.local/historico');

    const response = await useCase.execute(dto);

    expect(findManyIncluyendoInactivos).toHaveBeenCalledWith({
      page: dto.page,
      limit: dto.limit,
      plan_estrategico_id: dto.plan_estrategico_id,
      tipo_modulo_id: tipoModulo.id,
      search: dto.search,
    });
    expect(getPresignedUrl).toHaveBeenCalledWith(
      'docs',
      documento.ruta_archivo,
    );
    expect(response).toEqual({
      result,
      urls: new Map([[documento.id, 'https://minio.local/historico']]),
    });
  });

  it('devuelve un Map con una entrada por documento incluido en el resultado', async () => {
    const segundoDocumento = {
      ...documento,
      id: 21,
      ruta_archivo: 'otro-historico.pdf',
    } as DocumentoEstrategicoEntity;
    const result: PaginatedResult<DocumentoEstrategicoEntity> = {
      data: [documento, segundoDocumento],
      total: 2,
      page: 1,
      limit: 20,
    };
    findManyIncluyendoInactivos.mockResolvedValue(result);
    getPresignedUrl
      .mockResolvedValueOnce('https://minio.local/historico')
      .mockResolvedValueOnce('https://minio.local/otro-historico');

    const response = await useCase.execute({
      page: 1,
      limit: 20,
      plan_estrategico_id: 1,
    });

    expect(response.urls.size).toBe(result.data.length);
    expect(response.urls.get(segundoDocumento.id)).toBe(
      'https://minio.local/otro-historico',
    );
  });

  it('devuelve un Map vacío y no llama a getPresignedUrl si result.data está vacío', async () => {
    findManyIncluyendoInactivos.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    } satisfies PaginatedResult<DocumentoEstrategicoEntity>);

    const response = await useCase.execute({
      page: 1,
      limit: 20,
      plan_estrategico_id: 1,
    });

    expect(response.urls).toEqual(new Map());
    expect(getPresignedUrl).not.toHaveBeenCalled();
  });

  it('lanza 404 si el tipo de módulo NEG no existe', async () => {
    findTipoModuloByCodigo.mockResolvedValue(null);

    await expect(
      useCase.execute({ page: 1, limit: 20, plan_estrategico_id: 1 }),
    ).rejects.toThrow('Tipo de módulo NEG no encontrado');
    expect(findManyIncluyendoInactivos).not.toHaveBeenCalled();
  });
});
