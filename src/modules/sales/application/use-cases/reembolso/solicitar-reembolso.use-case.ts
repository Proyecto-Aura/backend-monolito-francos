import { Injectable, Logger } from '@nestjs/common';
import { EstadoPedido } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { ReembolsoRepository } from '../../../domain/repositories/reembolso.repository';
import {
  ReembolsoConPedido,
  ReembolsoDetalle,
} from '../../../domain/repositories/types/reembolso-repository.types';
import { EvidenciaReembolsoService } from '../../../domain/services/evidencia-reembolso.service';
import { SolicitarReembolsoDto } from '../../dto/reembolso-dtos/solicitar-reembolso.dto';
import {
  keyEvidenciaReembolso,
  nombreArchivoEvidencia,
} from '../../utils/reembolso.utils';

// Archivo de evidencia ya validado (tipo y tamaño) por el controlador.
export interface ArchivoEvidencia {
  nombre: string;
  tipo: string;
  contenido: Buffer;
}

// RF-B38: solo se reembolsa un pedido que terminó su ciclo.
const ESTADOS_REEMBOLSABLES: readonly EstadoPedido[] = [
  EstadoPedido.ENTREGADO,
  EstadoPedido.CONFIRMADO,
  EstadoPedido.CANCELADO,
];

// HU-B-014 (RF-B38 a RF-B40): el cliente solicita el reembolso de un pedido
// suyo pagado, con motivo y evidencia; la solicitud nace pendiente.
@Injectable()
export class SolicitarReembolsoUseCase {
  private readonly logger = new Logger(SolicitarReembolsoUseCase.name);

  constructor(
    private readonly pedidoRepository: PedidoRepository,
    private readonly reembolsoRepository: ReembolsoRepository,
    private readonly evidenciaService: EvidenciaReembolsoService,
  ) {}

  async execute(
    dto: SolicitarReembolsoDto,
    evidencia: ArchivoEvidencia,
    userId: string,
  ): Promise<ReembolsoDetalle> {
    const cliente =
      await this.pedidoRepository.findClienteParaResumenPorUser(userId);

    if (!cliente) {
      throw new ResourceNotFoundError(
        'No hay un cliente registrado para este usuario',
      );
    }

    if (!cliente.estado) {
      throw new ResourceConflictError(
        'El cliente está inactivo y no puede solicitar reembolsos',
      );
    }

    const pedido = await this.reembolsoRepository.findPedidoParaReembolso(
      dto.pedido_id,
    );

    // Un pedido de otro cliente se trata como inexistente.
    if (!pedido || pedido.cliente_id !== cliente.id) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    if (!pedido.pago) {
      throw new ResourceConflictError(
        `El pedido ${pedido.codigo} no tiene un pago registrado; no se puede reembolsar`,
      );
    }

    if (!ESTADOS_REEMBOLSABLES.includes(pedido.estado)) {
      throw new ResourceConflictError(
        `Solo se puede solicitar el reembolso de un pedido entregado, confirmado o cancelado; el pedido ${pedido.codigo} no lo está`,
      );
    }

    if (pedido.tiene_reembolso) {
      throw new ResourceConflictError(
        `El pedido ${pedido.codigo} ya tiene una solicitud de reembolso registrada`,
      );
    }

    // El código va en la key de la evidencia: se reserva antes de subirla.
    const { id, codigo } = await this.reembolsoRepository.reservarCodigo();
    const key = keyEvidenciaReembolso(
      codigo,
      nombreArchivoEvidencia(evidencia.nombre, evidencia.tipo),
    );

    await this.evidenciaService.subir(key, evidencia.contenido, evidencia.tipo);

    let solicitud: ReembolsoConPedido;
    try {
      solicitud = await this.reembolsoRepository.crearSolicitud({
        id,
        codigo,
        pago_id: pedido.pago.id,
        // RF-B39 (S-1): se devuelve el total pagado, calculado en el servidor.
        monto: pedido.pago.monto,
        motivo_cliente: `${dto.motivo}: ${dto.descripcion}`,
        evidencia_key: key,
      });
    } catch (error) {
      await this.borrarEvidencia(key);
      throw error;
    }

    return {
      ...solicitud,
      evidencia_url: await this.evidenciaService.urlDescarga(key),
    };
  }

  // Sin solicitud la evidencia queda huérfana. Si no se puede borrar, se deja
  // en el log y se responde con el error original.
  private async borrarEvidencia(key: string): Promise<void> {
    try {
      await this.evidenciaService.borrar(key);
    } catch (error) {
      this.logger.warn(
        `No se pudo borrar la evidencia huérfana ${key}: ${(error as Error).message}`,
      );
    }
  }
}
