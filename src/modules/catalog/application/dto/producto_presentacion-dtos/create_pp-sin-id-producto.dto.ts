import { OmitType } from '@nestjs/swagger';
import { CreateProductoPresentacionDto } from './create-producto_presentacion.dto';

export class CreatePPSinIdProducto extends OmitType(
  CreateProductoPresentacionDto,
  ['producto_id'] as const,
) {}
