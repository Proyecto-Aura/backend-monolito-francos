import { Injectable } from '@nestjs/common';
import {
  EstadoReembolso,
  TipoNotificacionReembolso,
} from '../../../domain/enums';
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { ReembolsoRepository } from '../../../domain/repositories/reembolso.repository';
import { ReembolsoDetalle } from '../../../domain/repositories/types/reembolso-repository.types';
import { estadoEnTexto } from '../../utils/reembolso.utils';
import { GetReembolsoByIdUseCase } from './get-reembolso-by-id.use-case';

// RF-A043: el operador de ventas rechaza una solicitud pendiente registrando el
// motivo; el rechazo no tiene vuelta atrás y el cliente recibe el aviso (RF-A045).
@Injectable()
export class RechazarReembolsoUseCase {
  constructor(
    private readonly reembolsoRepository: ReembolsoRepository,
    private readonly getReembolsoById: GetReembolsoByIdUseCase,
  ) {}

  async execute(
    id: number,
    motivoRechazo: string,
    userId: string,
  ): Promise<ReembolsoDetalle> {
    const motivo = motivoRechazo.trim();

    if (!motivo) {
      throw new InvalidRequestError('Indica el motivo del rechazo');
    }

    const solicitud = await this.reembolsoRepository.findById(id);

    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de reembolso no encontrada');
    }

    const { reembolso, pedido_codigo } = solicitud;

    if (reembolso.estado !== EstadoReembolso.PENDIENTE) {
      throw new ResourceConflictError(
        `La solicitud ${reembolso.codigo} ya está ${estadoEnTexto(reembolso.estado)}; solo se rechaza una pendiente`,
      );
    }

    const cambiado = await this.reembolsoRepository.cambiarEstado(
      id,
      EstadoReembolso.PENDIENTE,
      {
        estado: EstadoReembolso.RECHAZADO,
        motivo_rechazo: motivo,
        resuelto_por: userId,
        fecha_resolucion: new Date(),
      },
      {
        tipo: TipoNotificacionReembolso.RECHAZADO,
        titulo: 'Solicitud de reembolso rechazada',
        mensaje: `Tu solicitud ${reembolso.codigo} del pedido ${pedido_codigo} fue rechazada. Motivo: ${motivo}`,
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
