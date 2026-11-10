import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ResourceConflictError } from '../../domain/errors/sales-domain.errors';
import { ComprobanteRepository } from '../../domain/repositories/comprobante.repository';
import {
  ComprobanteEmitido,
  CreateComprobanteParams,
  EmisorComprobante,
} from '../../domain/repositories/types/comprobante-repository.types';
import {
  ComprobanteMapper,
  comprobanteConSerie,
} from '../mappers/comprobante.mapper';

@Injectable()
export class PrismaComprobanteRepository implements ComprobanteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPagoId(pagoId: number): Promise<ComprobanteEmitido | null> {
    const comprobante = await this.prisma.comprobante.findUnique({
      where: { pago_id: pagoId },
      include: comprobanteConSerie,
    });
    return comprobante ? ComprobanteMapper.toDomain(comprobante) : null;
  }

  async create(params: CreateComprobanteParams): Promise<ComprobanteEmitido> {
    try {
      const comprobante = await this.prisma.comprobante.create({
        data: params,
        include: comprobanteConSerie,
      });
      return ComprobanteMapper.toDomain(comprobante);
    } catch (error) {
      // uq_comprobante_pago: otra petición ya emitió el comprobante de este pago.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ResourceConflictError(
          'Este pago ya tiene un comprobante emitido',
        );
      }
      throw error;
    }
  }

  async findEmisor(): Promise<EmisorComprobante | null> {
    return this.prisma.empresa.findFirst({
      where: { es_emisora: true, estado: true },
      select: { razon_social: true, ruc: true, direccion: true },
    });
  }
}
