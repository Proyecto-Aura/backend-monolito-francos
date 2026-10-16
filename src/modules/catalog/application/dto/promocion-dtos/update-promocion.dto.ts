import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePromocionDto } from './create-promocion.dto';

// La presentación a la que pertenece la promoción no se puede cambiar.
export class UpdatePromocionDto extends PartialType(
  OmitType(CreatePromocionDto, ['producto_presentacion_id'] as const),
) {}
