import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, ValidateIf } from 'class-validator';
import { CreateObjetivoEstrategicoTiDto } from './create-objetivo-estrategico-ti.dto';

export class UpdateObjetivoEstrategicoTiDto extends PartialType(
  OmitType(CreateObjetivoEstrategicoTiDto, [
    'plan_estrategico_id',
    'oe_negocio_id',
  ] as const),
) {
  @ApiPropertyOptional({
    type: Number,
    example: 5,
    description: 'Objetivo estratégico de Negocio al que se alinea',
  })
  @ValidateIf(
    (o: UpdateObjetivoEstrategicoTiDto) => o.oe_negocio_id !== undefined,
  )
  @Type(() => Number)
  @IsInt()
  oe_negocio_id?: number;
}
