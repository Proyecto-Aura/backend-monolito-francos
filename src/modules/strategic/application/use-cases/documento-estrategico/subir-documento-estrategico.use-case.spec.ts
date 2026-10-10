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
import { CreateDocumentoEstrategicoDto } from '../../dto/documento-estrategico-dtos/create-documento-estrategico.dto';
import { SubirDocumentoEstrategicoUseCase } from './subir-documento-estrategico.use-case';

describe('SubirDocumentoEstrategicoUseCase', () => {
  const findActivoById = jest.fn();
  const existsByName = jest.fn();
  const create = jest.fn();
  const documentoEstrategicoRepository = {
    findActivoById,
    existsByName,
    create,
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
  let rutaSubida = '';

  const useCase = new SubirDocumentoEstrategicoUseCase(
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

  const documento = {
    id: 10,
    plan_estrategico_id: plan.id,
    tipo_modulo_id: tipoModulo.id,
    nombre: 'Informe final',
    ruta_archivo: 'archivo-existente.pdf',
    nombre_original: 'informe.pdf',
    estado: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  } as DocumentoEstrategicoEntity;

  const dto: CreateDocumentoEstrategicoDto = {
    plan_estrategico_id: plan.id,
    nombre: 'Informe final',
  };

  const archivo = {
    originalname: 'informe.pdf',
    buffer: Buffer.from('contenido'),
    mimetype: 'application/pdf',
  } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    rutaSubida = '';
    upload.mockImplementation((_bucket: string, key: string) => {
      rutaSubida = key;
    });
  });

  it('lanza 404 si el plan no existe o está eliminado lógicamente', async () => {
    findPlanActivoById.mockResolvedValue(null);

    await expect(useCase.execute(dto, archivo)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findTipoModuloByCodigo).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si el plan no está en Borrador', async () => {
    findPlanActivoById.mockResolvedValue({
      ...plan,
      estado_plan: { ...plan.estado_plan, codigo: 'ACTIVO' },
    });

    await expect(useCase.execute(dto, archivo)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );

    expect(findTipoModuloByCodigo).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 404 si el tipo de módulo NEG no existe o está inactivo', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findTipoModuloByCodigo.mockResolvedValue({ ...tipoModulo, estado: false });

    await expect(useCase.execute(dto, archivo)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(findTipoModuloByCodigo).toHaveBeenCalledWith('NEG');
    expect(upload).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si ya existe un documento con el mismo nombre en el plan', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    existsByName.mockResolvedValue(true);

    await expect(useCase.execute(dto, archivo)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );

    expect(existsByName).toHaveBeenCalledWith(
      plan.id,
      tipoModulo.id,
      dto.nombre,
    );
    expect(upload).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('normaliza el nombre antes de validar duplicados y crear', async () => {
    const dtoConEspacios = {
      ...dto,
      nombre: '  Informe   final  ',
    };
    findPlanActivoById.mockResolvedValue(plan);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    existsByName.mockResolvedValue(false);
    create.mockResolvedValue(documento);

    await useCase.execute(dtoConEspacios, archivo);

    expect(existsByName).toHaveBeenCalledWith(
      plan.id,
      tipoModulo.id,
      'Informe final',
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        plan_estrategico_id: plan.id,
        nombre: 'Informe final',
        nombre_original: archivo.originalname,
      }),
      tipoModulo.id,
    );
  });

  it('sube el archivo, crea el registro y devuelve la entidad', async () => {
    findPlanActivoById.mockResolvedValue(plan);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    existsByName.mockResolvedValue(false);
    create.mockResolvedValue(documento);

    await expect(useCase.execute(dto, archivo)).resolves.toBe(documento);

    expect(upload).toHaveBeenCalledWith(
      'docs',
      expect.stringMatching(/^[0-9a-f-]+\.pdf$/),
      archivo.buffer,
      archivo.mimetype,
    );
    expect(create).toHaveBeenCalledWith(
      {
        plan_estrategico_id: plan.id,
        nombre: dto.nombre,
        ruta_archivo: rutaSubida,
        nombre_original: archivo.originalname,
      },
      tipoModulo.id,
    );
  });

  it('borra el objeto si create rechaza y relanza el error original', async () => {
    const error = new Error('fallo al crear el documento');
    findPlanActivoById.mockResolvedValue(plan);
    findTipoModuloByCodigo.mockResolvedValue(tipoModulo);
    existsByName.mockResolvedValue(false);
    create.mockRejectedValue(error);

    await expect(useCase.execute(dto, archivo)).rejects.toBe(error);

    expect(deleteObject).toHaveBeenCalledTimes(1);
    expect(deleteObject).toHaveBeenCalledWith('docs', rutaSubida);
  });
});
