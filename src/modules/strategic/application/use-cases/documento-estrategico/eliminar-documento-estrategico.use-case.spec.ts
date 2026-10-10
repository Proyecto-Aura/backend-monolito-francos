import { S3Service } from '../../../../../infrastructure/storage/s3.service';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { DocumentoEstrategicoRepository } from '../../../domain/repositories/documento-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { DocumentoEstrategicoEntity } from '../../../domain/entities';
import { PlanEstrategicoEntityConEstado } from '../../../domain/repositories/types/plan-estrategico-repository.types';
import { EliminarDocumentoEstrategicoUseCase } from './eliminar-documento-estrategico.use-case';

describe('EliminarDocumentoEstrategicoUseCase', () => {
  const findDocumentoActivoById = jest.fn();
  const deleteById = jest.fn();
  const documentoEstrategicoRepository = {
    findActivoById: findDocumentoActivoById,
    deleteById,
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

  const useCase = new EliminarDocumentoEstrategicoUseCase(
    documentoEstrategicoRepository,
    planEstrategicoRepository,
    tipoModuloRepository,
    s3Service,
  );

  const tipoModulo = {
    id: 7,
    codigo: 'NEG',
    nombre: 'Negocio',
    estado: true,
  };

  const documento = {
    id: 10,
    plan_estrategico_id: 1,
    tipo_modulo_id: tipoModulo.id,
    nombre: 'Informe final',
    ruta_archivo: 'archivo-existente.pdf',
    nombre_original: 'informe.pdf',
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

  it('lanza 404 si el documento no existe o está eliminado lógicamente', async () => {
    findDocumentoActivoById.mockResolvedValue(null);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);

    await expect(useCase.execute(documento.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(deleteObject).not.toHaveBeenCalled();
    expect(deleteById).not.toHaveBeenCalled();
  });

  it('lanza 404 si el documento no pertenece al tipo de módulo NEG', async () => {
    findDocumentoActivoById.mockResolvedValue({
      ...documento,
      tipo_modulo_id: 99,
    });
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);

    await expect(useCase.execute(documento.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findPlanActivoById).not.toHaveBeenCalled();
    expect(deleteObject).not.toHaveBeenCalled();
    expect(deleteById).not.toHaveBeenCalled();
  });

  it('lanza 404 si el plan asociado no existe o está eliminado lógicamente', async () => {
    findDocumentoActivoById.mockResolvedValue(documento);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(documento.id)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(deleteObject).not.toHaveBeenCalled();
    expect(deleteById).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en Borrador', async () => {
    findDocumentoActivoById.mockResolvedValue(documento);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });

    await expect(useCase.execute(documento.id)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );

    expect(deleteObject).not.toHaveBeenCalled();
    expect(deleteById).not.toHaveBeenCalled();
  });

  it('borra primero el objeto de S3 y luego la fila del repositorio', async () => {
    findDocumentoActivoById.mockResolvedValue(documento);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    findPlanActivoById.mockResolvedValue(plan);

    await expect(useCase.execute(documento.id)).resolves.toBeUndefined();

    expect(deleteObject).toHaveBeenCalledWith('docs', documento.ruta_archivo);
    expect(deleteById).toHaveBeenCalledWith(documento.id);
    expect(deleteObject.mock.invocationCallOrder[0]).toBeLessThan(
      deleteById.mock.invocationCallOrder[0],
    );
  });
});
