import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductoPresentacionDto } from './create-producto_presentacion.dto';

export class UpdateProductoPresentacionDto extends PartialType(
  OmitType(CreateProductoPresentacionDto, [
    'producto_id',
    'presentacion_id',
    'estado',
  ] as const),
) {}
