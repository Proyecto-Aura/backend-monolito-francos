jest.mock('../../../../../config/envs', () => ({
  envs: {},
}));

import type { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { DocumentoEstrategicoEntity } from '../../../domain/entities';
import { DocumentoEstrategicoRepository } from '../../../domain/repositories/documento-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { ListDocumentoEstrategicoQueryDto } from '../../dto/documento-estrategico-dtos/list-documento-estrategico-query.dto';
import { ListarDocumentosEstrategicosTiUseCase } from './listar-documentos-estrategicos-ti.use-case';

describe('ListarDocumentosEstrategicosTiUseCase', () => {
  const findMany = jest.fn();
  const documentoEstrategicoRepository = {
    findMany,
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

  const useCase = new ListarDocumentosEstrategicosTiUseCase(
    documentoEstrategicoRepository,
    tipoModuloRepository,
    s3Service,
  );

  const tipoModulo = { id: 8, codigo: 'TI', estado: true };

  const documentoUno = {
    id: 10,
    plan_estrategico_id: 1,
    tipo_modulo_id: tipoModulo.id,
    nombre: 'Informe de arquitectura TI',
    ruta_archivo: 'informe-arquitectura-ti.pdf',
    nombre_original: 'informe-ti.pdf',
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  } as DocumentoEstrategicoEntity;

  const documentoDos = {
    ...documentoUno,
    id: 11,
    nombre: 'Presentación tecnológica',
    ruta_archivo: 'presentacion-tecnologica.pptx',
  } as DocumentoEstrategicoEntity;

  const dto: ListDocumentoEstrategicoQueryDto = {
    page: 2,
    limit: 10,
    plan_estrategico_id: 1,
    search: 'arquitectura',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
  });

  it('llama a findMany con el tipo TI y devuelve las URLs presignadas', async () => {
    const result: PaginatedResult<DocumentoEstrategicoEntity> = {
      data: [documentoUno, documentoDos],
      total: 2,
      page: dto.page,
      limit: dto.limit,
    };
    findMany.mockResolvedValue(result);
    getPresignedUrl
      .mockResolvedValueOnce('https://minio.local/informe-ti')
      .mockResolvedValueOnce('https://minio.local/presentacion-ti');

    const response = await useCase.execute(dto);

    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(findMany).toHaveBeenCalledWith({
      page: dto.page,
      limit: dto.limit,
      plan_estrategico_id: dto.plan_estrategico_id,
      tipo_modulo_id: tipoModulo.id,
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
        [documentoUno.id, 'https://minio.local/informe-ti'],
        [documentoDos.id, 'https://minio.local/presentacion-ti'],
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
    getPresignedUrl.mockResolvedValue('https://minio.local/documento-ti');

    const response = await useCase.execute({
      page: 1,
      limit: 10,
      plan_estrategico_id: 1,
    });

    expect(response.urls).toEqual(
      new Map([[documentoUno.id, 'https://minio.local/documento-ti']]),
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

  it('lanza 404 si el tipo de módulo TI no existe', async () => {
    findTipoModuloByCodigo.mockResolvedValue(null);

    await expect(
      useCase.execute({ page: 1, limit: 10, plan_estrategico_id: 1 }),
    ).rejects.toThrow('Tipo de módulo TI no encontrado');
    expect(findMany).not.toHaveBeenCalled();
  });
});
