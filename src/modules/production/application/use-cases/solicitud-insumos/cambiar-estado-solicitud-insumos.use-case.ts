import { Injectable } from '@nestjs/common';
import { SolicitudInsumosEntity } from '../../../domain/entities';
import { EstadoSolicitudInsumos } from '../../../domain/enums';
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { RegistrarSalidaInsumoUseCase } from '../../../../inventory/application/use-cases/movimiento-insumo/registrar-salida-insumo.use-case';
import { SolicitudInsumosDetalleRepository } from '../../../domain/repositories/solicitud-insumos-detalle.repository';
import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';
import { ItemCantidadEntregadaInsumoDto } from '../../dto/solicitud-insumos-dtos/cambiar-estado-solicitud-insumos.dto';

// pendiente -> en_proceso -> entregado. rechazado solo se alcanza desde
// pendiente (ni produccion ni inventario rechazan algo ya en marcha).
const TRANSICIONES_VALIDAS: Record<
  EstadoSolicitudInsumos,
  EstadoSolicitudInsumos[]
> = {
  [EstadoSolicitudInsumos.PENDIENTE]: [
    EstadoSolicitudInsumos.EN_PROCESO,
    EstadoSolicitudInsumos.RECHAZADO,
  ],
  [EstadoSolicitudInsumos.EN_PROCESO]: [EstadoSolicitudInsumos.ENTREGADO],
  [EstadoSolicitudInsumos.ENTREGADO]: [],
  [EstadoSolicitudInsumos.RECHAZADO]: [],
};

@Injectable()
export class CambiarEstadoSolicitudInsumosUseCase {
  constructor(
    private readonly solicitudInsumosRepository: SolicitudInsumosRepository,
    private readonly solicitudInsumosDetalleRepository: SolicitudInsumosDetalleRepository,
    private readonly registrarSalidaInsumo: RegistrarSalidaInsumoUseCase,
  ) {}

  async execute(
    id: number,
    nuevoEstado: EstadoSolicitudInsumos,
    roles: string[],
    items?: ItemCantidadEntregadaInsumoDto[],
  ): Promise<SolicitudInsumosEntity> {
    const solicitud = await this.solicitudInsumosRepository.findById(id);
    if (!solicitud) {
      throw new ResourceNotFoundError('Solicitud de insumos no encontrada');
    }

    const transicionesPermitidas = TRANSICIONES_VALIDAS[solicitud.estado];
    if (!transicionesPermitidas.includes(nuevoEstado)) {
      throw new ResourceConflictError(
        `No se puede pasar de "${solicitud.estado}" a "${nuevoEstado}"`,
      );
    }

    // Espejo de solicitud de producción con los roles invertidos: producción
    // solo puede "cancelar" (rechazar) mientras está pendiente; avanzar a
    // en_proceso/entregado es cosa de inventario. Admin tiene acceso total,
    // así que puede hacer lo mismo que inventario además de rechazar.
    const esAdmin = roles.includes('admin');
    const esInventario = roles.includes('inventario');
    const puedeAvanzar = esInventario || esAdmin;
    const puedeRechazar =
      esAdmin || roles.includes('produccion') || esInventario;

    if (nuevoEstado === EstadoSolicitudInsumos.RECHAZADO) {
      if (!puedeRechazar) {
        throw new ResourceConflictError(
          'No tenés permiso para rechazar esta solicitud',
        );
      }
    } else if (!puedeAvanzar) {
      throw new ResourceConflictError(
        'Solo inventario (o un admin) puede mover la solicitud a este estado',
      );
    }

    // Al entregar, se descuenta stock de verdad: una salida FEFO por cada
    // línea del detalle, ligada a esta solicitud. Si falta stock de algún
    // insumo no se crea ninguna salida (ver RegistrarSalidaInsumoUseCase.
    // executeMany) ni se cambia el estado.
    if (nuevoEstado === EstadoSolicitudInsumos.ENTREGADO) {
      const detalle =
        await this.solicitudInsumosDetalleRepository.findBySolicitudId(id);

      // `items` es opcional: si no se manda, se despacha cantidad_solicitada
      // de cada línea (comportamiento original). Si se manda, debe cubrir
      // exactamente las líneas del detalle, ni más ni menos, sin repetidos
      // (mismo criterio que EntregarPedidoADespachoUseCase).
      if (items && items.length > 0) {
        const idsDetalle = new Set(detalle.map((linea) => linea.insumo_id));
        const idsItems = new Set(items.map((item) => item.insumo_id));
        const noCoincide =
          items.length !== idsItems.size ||
          idsDetalle.size !== idsItems.size ||
          [...idsDetalle].some((insumoId) => !idsItems.has(insumoId));

        if (noCoincide) {
          throw new InvalidRequestError(
            'Las cantidades entregadas no coinciden con las líneas del detalle',
          );
        }
      }

      const salidas = detalle.map((linea) => {
        const cantidad =
          items?.find((item) => item.insumo_id === linea.insumo_id)
            ?.cantidad_entregada ?? linea.cantidad_solicitada;

        return {
          insumo_id: linea.insumo_id,
          cantidad,
          razon: `Salida por solicitud de insumos ${solicitud.codigo_solicitud}`,
          solicitud_insumos_id: id,
        };
      });

      await this.registrarSalidaInsumo.executeMany(salidas);
    }

    return this.solicitudInsumosRepository.updateEstado(id, nuevoEstado);
  }
}
