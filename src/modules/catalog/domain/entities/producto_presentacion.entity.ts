import { Decimal } from '@prisma/client/runtime/client';

export class ProductoPresentacionEntity {
  constructor(
    public readonly id: number,
    public sku: string,
    public precio_unitario: number,
    public precio_mayorista: number | null,
    public umbral_mayorista: number | null,
    public producto_id: number,
    public presentacion_id: number,
    public imagen_url: string | null,
    public slug: string | null,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
