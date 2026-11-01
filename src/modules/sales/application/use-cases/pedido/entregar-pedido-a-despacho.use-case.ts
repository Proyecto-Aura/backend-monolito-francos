import { Injectable } from '@nestjs/common';
import { RegistrarSalidaProductoTerminadoUseCase } from '../../../../inventory/application/use-cases/movimiento-producto-terminado/registrar-salida-producto-terminado.use-case';
import { EstadoPedido } from '../../../domain/enums';
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';
import { esTransicionDeInventario } from '../../../domain/rules/transiciones-pedido';
import { ItemPreparadoDto } from '../../dto/pedido-dtos/entregar-pedido-despacho.dto';

// El operario de productos terminados ya preparó el pedido: registra la
// salida de inventario de lo realmente preparado (FEFO por lote, vía el
// módulo de inventario) y lo deja listo para que despacho lo recoja.
@Injectable()
export class EntregarPedidoADespachoUseCase {
  constructor(
    private readonly pedidoRepository: PedidoRepository,
    private readonly registrarSalidaProductoTerminado: RegistrarSalidaProductoTerminadoUseCase,
  ) {}

  async execute(id: number, items: ItemPreparadoDto[]): Promise<PedidoDetalle> {
    const pedido = await this.pedidoRepository.findById(id);

    if (!pedido) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    if (
      !esTransicionDeInventario(pedido.estado, EstadoPedido.PENDIENTE_ENTREGA)
    ) {
      throw new ResourceConflictError(
        `No se puede pasar el pedido ${pedido.codigo} de ${pedido.estado} a ${EstadoPedido.PENDIENTE_ENTREGA}`,
      );
    }

    const detalle = await this.pedidoRepository.findDetalleById(id);
    if (!detalle) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    // Debe venir una cantidad preparada por cada item del pedido, ni más ni
    // menos, sin repetidos (un Set oculta duplicados, por eso se compara
    // también contra items.length).
    const idsDelPedido = new Set(
      detalle.detalles.map((d) => d.detalle.producto_presentacion_id),
    );
    const idsRecibidos = new Set(
      items.map((item) => item.producto_presentacion_id),
    );
    const faltanOSobran =
      items.length !== idsRecibidos.size ||
      idsDelPedido.size !== idsRecibidos.size ||
      [...idsDelPedido].some((pid) => !idsRecibidos.has(pid));

    if (faltanOSobran) {
      throw new InvalidRequestError(
        'Los items preparados no coinciden con los items del pedido',
      );
    }

    const salidas = detalle.detalles.map((d) => {
      const preparado = items.find(
        (item) =>
          item.producto_presentacion_id === d.detalle.producto_presentacion_id,
      )!;

      if (d.producto_terminado_id === null) {
        throw new InvalidRequestError(
          `La presentación ${d.sku} no tiene producto terminado asociado`,
        );
      }

      return {
        producto_terminado_id: d.producto_terminado_id,
        cantidad: preparado.cantidad_preparada,
        razon: `Salida por preparación de pedido ${pedido.codigo}`,
      };
    });

    // Si falta stock para alguna línea, no se crea ninguna salida (ver
    // RegistrarSalidaProductoTerminadoUseCase.executeMany) ni se cambia el estado.
    await this.registrarSalidaProductoTerminado.executeMany(salidas);

    const cambiado = await this.pedidoRepository.cambiarEstado(
      id,
      pedido.estado,
      EstadoPedido.PENDIENTE_ENTREGA,
    );

    if (!cambiado) {
      throw new ResourceConflictError(
        `El pedido ${pedido.codigo} cambió de estado mientras tanto; vuelve a consultarlo`,
      );
    }

    const actualizado = await this.pedidoRepository.findDetalleById(id);
    if (!actualizado) {
      throw new ResourceNotFoundError('Pedido no encontrado');
    }

    return actualizado;
  }
}
