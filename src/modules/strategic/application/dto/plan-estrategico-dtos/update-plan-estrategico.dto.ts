import { PartialType } from '@nestjs/swagger';
import { CreatePlanEstrategicoDto } from './create-plan-estrategico.dto';

export class UpdatePlanEstrategicoDto extends PartialType(
  CreatePlanEstrategicoDto,
) {}
