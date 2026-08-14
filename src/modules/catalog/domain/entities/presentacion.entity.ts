import { UnidadMedidaPresentacion } from '../enums';

export class PresentacionEntity {
  constructor(
    public readonly id: number,
    public cantidad: number,
    public unidad_medida: UnidadMedidaPresentacion,
    public descripcion: string | null,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
