import { TipoComprobante } from '../../enums/sales.enums';
import { PaginationParams } from './pagination.types';

export interface CreateSerieComprobanteParams {
  tipo: TipoComprobante;
  serie: string;
  correlativo_inicio: number;
  correlativo_fin: number;
  correlativo_actual: number;
  umbral_alerta: number;
  estado: boolean;
}

export interface UpdateSerieComprobanteParams {
  tipo?: TipoComprobante;
  serie?: string;
  correlativo_inicio?: number;
  correlativo_fin?: number;
  correlativo_actual?: number;
  umbral_alerta?: number;
}

export interface ListSeriesComprobanteParams extends PaginationParams {
  tipo?: TipoComprobante;
  estado?: boolean;
  por_agotar?: boolean;
}

export interface CorrelativoReservado {
  serie_id: number;
  serie: string;
  numero: number;
}
