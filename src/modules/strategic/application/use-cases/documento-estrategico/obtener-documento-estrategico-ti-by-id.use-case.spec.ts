jest.mock('../../../../../config/envs', () => ({
  envs: {},
}));

import type { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { DocumentoEstrategicoEntity } from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../domain/errors/strategic-domain.errors';
import { DocumentoEstrategicoRepository } from '../../../domain/repositories/documento-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { ObtenerDocumentoEstrategicoTiByIdUseCase } from './obtener-documento-estrategico-ti-by-id.use-case';

describe('ObtenerDocumentoEstrategicoTiByIdUseCase', () => {
  const findDocumentoActivoById = jest.fn();
  const documentoEstrategicoRepository = {
    findActivoById: findDocumentoActivoById,
  } as unknown as jest.Mocked<DocumentoEstrategicoRepository>;

  const findPlanActivoById = jest.fn();
  const planEstrategicoRepository = {
    findActivoById: findPlanActivoById,
  } as unknown as jest.Mocked<PlanEstrategicoRepository>;

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

  const useCase = new ObtenerDocumentoEstrategicoTiByIdUseCase(
    documentoEstrategicoRepository,
    planEstrategicoRepository,
    tipoModuloRepository,
    s3Service,
  );

  const tipoModulo = {
    id: 8,
    codigo: 'TI',
    nombre: 'Tecnología de la Información',
    estado: true,
  };

  const documento = {
    id: 30,
    plan_estrategico_id: 1,
    tipo_modulo_id: tipoModulo.id,
    nombre: 'Informe estratégico TI',
    ruta_archivo: 'informe-estrategico-ti.pdf',
    nombre_original: 'informe-ti.pdf',
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  } as DocumentoEstrategicoEntity;

  const plan = {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan Estratégico 2026',
    descripcion: null,
    anio_inicio: 2026,
    anio_fin: 2030,
    estado_plan_id: 1,
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    estado_plan: {
      id: 1,
      codigo: 'BORRADOR',
      nombre: 'Borrador',
      orden: 1,
      estado: true,
    },
  } as PlanEstrategicoEntityConEstado;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const prepararDependencias = () => {
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);
  };

  it('lanza 404 si el documento no existe o está eliminado lógicamente', async () => {
    findDocumentoActivoById.mockResolvedValue(null);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);

    await expect(useCase.execute(documento.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(getPresignedUrl).not.toHaveBeenCalled();
  });

  it('lanza 404 si el documento no pertenece al tipo de módulo TI', async () => {
    findDocumentoActivoById.mockResolvedValue({
      ...documento,
      tipo_modulo_id: 99,
    });
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);

    await expect(useCase.execute(documento.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('TI');
    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(getPresignedUrl).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan asociado no existe o está eliminado lógicamente', async () => {
    findDocumentoActivoById.mockResolvedValue(documento);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(documento.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(getPresignedUrl).not.toHaveBeenCalled();
  });

  it('devuelve el documento TI y su URL presignada', async () => {
    prepararDependencias();
    findDocumentoActivoById.mockResolvedValue(documento);
    getPresignedUrl.mockResolvedValue('https://minio.local/documento-ti');

    await expect(useCase.execute(documento.id)).resolves.toEqual({
      documento,
      url: 'https://minio.local/documento-ti',
    });

    expect(getPresignedUrl).toHaveBeenCalledWith(
      'docs',
      documento.ruta_archivo,
    );
  });

  it('permite consultar el documento aunque el plan esté en estado ACTIVO', async () => {
    prepararDependencias();
    findDocumentoActivoById.mockResolvedValue(documento);
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });
    getPresignedUrl.mockResolvedValue(
      'https://minio.local/documento-ti-activo',
    );

    await expect(useCase.execute(documento.id)).resolves.toEqual({
      documento,
      url: 'https://minio.local/documento-ti-activo',
    });

    expect(getPresignedUrl).toHaveBeenCalledWith(
      'docs',
      documento.ruta_archivo,
    );
  });
});
