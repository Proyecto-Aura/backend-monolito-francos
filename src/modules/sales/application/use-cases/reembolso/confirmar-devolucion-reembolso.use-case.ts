import { Injectable } from '@nestjs/common';
import {
  EstadoReembolso,
  MetodoPago,
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

// RF-A044: cuando Culqi confirma la devolución de un pago con Culqi, la
// solicitud aprobada pasa a reembolsado y el cliente recibe el aviso (RF-A045).
// Sin llaves de Culqi (no hay RUC) la confirmación es simulada: la registra el
// operador de ventas para demostrar el flujo; no se llama a Culqi.
@Injectable()
export class ConfirmarDevolucionReembolsoUseCase {
  constructor(
    private readonly reembolsoRepository: ReembolsoRepository,
    private readonly getReembolsoById: GetReembolsoByIdUseCase,
  ) {}

  async execute(id: number): Promise<ReembolsoDetalle> {
    const solicitud = await this.reembolsoRepository.findById(id);

    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de reembolso no encontrada');
    }

    const { reembolso, pedido_codigo, metodo_pago } = solicitud;

    if (metodo_pago !== MetodoPago.CULQI) {
      throw new ResourceConflictError(
        `La solicitud ${reembolso.codigo} no se pagó con Culqi; no hay devolución que confirmar`,
      );
    }

    if (reembolso.estado !== EstadoReembolso.APROBADO) {
      throw new ResourceConflictError(
        `La solicitud ${reembolso.codigo} está ${estadoEnTexto(reembolso.estado)}; solo se confirma la devolución de una aprobada`,
      );
    }

    const cambiado = await this.reembolsoRepository.cambiarEstado(
      id,
      EstadoReembolso.APROBADO,
      { estado: EstadoReembolso.REEMBOLSADO },
      {
        tipo: TipoNotificacionReembolso.PROCESADO,
        titulo: 'Reembolso procesado',
        mensaje: `Se procesó la devolución de S/ ${reembolso.monto.toFixed(2)} de tu solicitud ${reembolso.codigo} del pedido ${pedido_codigo}.`,
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
