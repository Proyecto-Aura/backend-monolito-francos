import { Injectable } from '@nestjs/common';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { DocumentoEstrategicoEntity } from '../../../domain/entities';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/strategic-domain.errors';
import { DocumentoEstrategicoRepository } from '../../../domain/repositories/documento-estrategico.repository';
import { PlanEstrategicoRepository } from '../../../domain/repositories/plan-estrategico.repository';
import { TipoModuloRepository } from '../../../domain/repositories/tipo-modulo.repository';
import { CreateDocumentoEstrategicoDto } from '../../dto/documento-estrategico-dtos/create-documento-estrategico.dto';

@Injectable()
export class SubirDocumentoEstrategicoUseCase {
  constructor(
    private readonly documentoEstrategicoRepository: DocumentoEstrategicoRepository,
    private readonly planEstrategicoRepository: PlanEstrategicoRepository,
    private readonly tipoModuloRepository: TipoModuloRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(
    dto: CreateDocumentoEstrategicoDto,
    archivo: Express.Multer.File,
  ): Promise<DocumentoEstrategicoEntity> {
    const plan = await this.planEstrategicoRepository.findActivoById(
      dto.plan_estrategico_id,
    );
    if (!plan) {
      throw new ResourceNotFoundError('Plan estratégico no encontrado');
    }
    if (plan.estado_plan.codigo !== 'BORRADOR') {
      throw new ResourceConflictError(
        'Solo se pueden subir documentos cuando el plan está en Borrador',
      );
    }

    const tipoModulo = await this.tipoModuloRepository.findByCodigo('NEG');
    if (!tipoModulo || !tipoModulo.estado) {
      throw new ResourceNotFoundError('Tipo de módulo NEG no encontrado');
    }

    const nombre = dto.nombre.trim().replace(/\s+/g, ' ');
    const existe = await this.documentoEstrategicoRepository.existsByName(
      plan.id,
      tipoModulo.id,
      nombre,
    );
    if (existe) {
      throw new ResourceConflictError(
        'Ya existe un documento registrado con ese nombre en el plan',
      );
    }

    const extension = extname(archivo.originalname);
    const rutaArchivo = `${randomUUID()}${extension}`;

    await this.s3Service.upload(
      'docs',
      rutaArchivo,
      archivo.buffer,
      archivo.mimetype,
    );

    return this.documentoEstrategicoRepository.create(
      {
        plan_estrategico_id: plan.id,
        nombre,
        ruta_archivo: rutaArchivo,
        nombre_original: archivo.originalname,
      },
      tipoModulo.id,
    );
  }
}
