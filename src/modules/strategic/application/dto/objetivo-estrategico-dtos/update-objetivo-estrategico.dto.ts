import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateObjetivoEstrategicoDto } from './create-objetivo-estrategico.dto';

export class UpdateObjetivoEstrategicoDto extends PartialType(
  OmitType(CreateObjetivoEstrategicoDto, ['plan_estrategico_id'] as const),
) {}
