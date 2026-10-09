import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { DocumentoEstrategicoRepository } from '../../domain/repositories/documento-estrategico.repository';
import {
  CreateDocumentoEstrategicoParams,
  ListDocumentosEstrategicosParams,
} from '../../domain/repositories/types/documento-estrategico-repository.types';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import { DocumentoEstrategicoEntity } from '../../domain/entities';
import { DocumentoEstrategicoMapper } from '../mappers/documento-estrategico.mapper';

@Injectable()
export class PrismaDocumentoEstrategicoRepository implements DocumentoEstrategicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async buscar(
    params: ListDocumentosEstrategicosParams,
    soloActivos: boolean,
  ): Promise<PaginatedResult<DocumentoEstrategicoEntity>> {
    const where: Prisma.DocumentoEstrategicoWhereInput = {
      plan_estrategico_id: params.plan_estrategico_id,
      tipo_modulo: { codigo: 'NEG' },
      ...(soloActivos ? { estado: true } : {}),
      ...(params.search
        ? { nombre: { contains: params.search, mode: 'insensitive' } }
        : {}),
    };

    const [documentos, total] = await this.prisma.$transaction([
      this.prisma.documentoEstrategico.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.documentoEstrategico.count({ where }),
    ]);

    return {
      data: documentos.map((documento) =>
        DocumentoEstrategicoMapper.toDomain(documento),
      ),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async findMany(
    params: ListDocumentosEstrategicosParams,
  ): Promise<PaginatedResult<DocumentoEstrategicoEntity>> {
    return this.buscar(params, true);
  }

  async findManyIncluyendoInactivos(
    params: ListDocumentosEstrategicosParams,
  ): Promise<PaginatedResult<DocumentoEstrategicoEntity>> {
    return this.buscar(params, false);
  }

  async findActivoById(id: number): Promise<DocumentoEstrategicoEntity | null> {
    const documento = await this.prisma.documentoEstrategico.findFirst({
      where: { id, estado: true },
    });
    return documento ? DocumentoEstrategicoMapper.toDomain(documento) : null;
  }

  async findById(id: number): Promise<DocumentoEstrategicoEntity | null> {
    const documento = await this.prisma.documentoEstrategico.findUnique({
      where: { id },
    });
    return documento ? DocumentoEstrategicoMapper.toDomain(documento) : null;
  }

  async existsByName(
    planId: number,
    tipoModuloId: number,
    nombre: string,
  ): Promise<boolean> {
    const documento = await this.prisma.documentoEstrategico.findFirst({
      where: {
        plan_estrategico_id: planId,
        tipo_modulo_id: tipoModuloId,
        nombre: { equals: nombre, mode: 'insensitive' },
        estado: true,
      },
      select: { id: true },
    });
    return documento !== null;
  }

  async create(
    params: CreateDocumentoEstrategicoParams,
    tipoModuloId: number,
  ): Promise<DocumentoEstrategicoEntity> {
    const documento = await this.prisma.documentoEstrategico.create({
      data: {
        plan_estrategico_id: params.plan_estrategico_id,
        tipo_modulo_id: tipoModuloId,
        nombre: params.nombre,
        ruta_archivo: params.ruta_archivo,
        nombre_original: params.nombre_original,
      },
    });
    return DocumentoEstrategicoMapper.toDomain(documento);
  }

  async setEstado(
    id: number,
    estado: boolean,
  ): Promise<DocumentoEstrategicoEntity> {
    const documento = await this.prisma.documentoEstrategico.update({
      where: { id },
      data: { estado },
    });
    return DocumentoEstrategicoMapper.toDomain(documento);
  }
}
