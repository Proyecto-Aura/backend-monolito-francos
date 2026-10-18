import { Injectable } from '@nestjs/common';
import {
  EstadoReembolso,
  TipoNotificacionReembolso,
} from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { ReembolsoRepository } from '../../../domain/repositories/reembolso.repository';
import { ReembolsoDetalle } from '../../../domain/repositories/types/reembolso-repository.types';
import { estadoEnTexto } from '../../utils/reembolso.utils';
import { GetReembolsoByIdUseCase } from './get-reembolso-by-id.use-case';

// RF-A042: el operador de ventas aprueba una solicitud pendiente después de
// validar el motivo y la evidencia, y el cliente recibe el aviso (RF-A045).
@Injectable()
export class AprobarReembolsoUseCase {
  constructor(
    private readonly reembolsoRepository: ReembolsoRepository,
    private readonly getReembolsoById: GetReembolsoByIdUseCase,
  ) {}

  async execute(id: number, userId: string): Promise<ReembolsoDetalle> {
    const solicitud = await this.reembolsoRepository.findById(id);

    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de reembolso no encontrada');
    }

    const { reembolso, pedido_codigo } = solicitud;

    if (reembolso.estado !== EstadoReembolso.PENDIENTE) {
      throw new ResourceConflictError(
        `La solicitud ${reembolso.codigo} ya está ${estadoEnTexto(reembolso.estado)}; solo se aprueba una pendiente`,
      );
    }

    if (!reembolso.motivo_cliente.trim() || !reembolso.evidencia_key) {
      throw new ResourceConflictError(
        `No se puede aprobar ${reembolso.codigo}: la solicitud requiere motivo y evidencia adjunta`,
      );
    }

    const cambiado = await this.reembolsoRepository.cambiarEstado(
      id,
      EstadoReembolso.PENDIENTE,
      {
        estado: EstadoReembolso.APROBADO,
        resuelto_por: userId,
        fecha_resolucion: new Date(),
      },
      {
        tipo: TipoNotificacionReembolso.APROBADO,
        titulo: 'Solicitud de reembolso aprobada',
        mensaje: `Tu solicitud ${reembolso.codigo} del pedido ${pedido_codigo} fue aprobada. Te devolveremos S/ ${reembolso.monto.toFixed(2)}.`,
      },
    );

    if (!cambiado) {
      throw new ResourceConflictError(
        `La solicitud ${reembolso.codigo} cambió de estado mientras tanto; vuelve a consultarla`,
      );
    }

    return this.getReembolsoById.execute(id);
  }
}
