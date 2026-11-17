import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { CreateObjetivoEstrategicoDto } from './create-objetivo-estrategico.dto';

export class CreateObjetivoEstrategicoTiDto extends CreateObjetivoEstrategicoDto {
  @ApiProperty({
    type: Number,
    example: 5,
    description: 'Objetivo estratégico de Negocio al que se alinea',
  })
  @Type(() => Number)
  @IsInt()
  oe_negocio_id!: number;
}
