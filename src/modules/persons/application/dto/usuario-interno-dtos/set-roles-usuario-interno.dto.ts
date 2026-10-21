import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsPositive,
} from 'class-validator';

export class SetRolesUsuarioInternoDto {
  @ApiProperty({
    type: [Number],
    example: [2],
    description:
      'ids de los roles a dejar activos (ver GET /roles). Mínimo uno; no se admite el rol cliente',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  rol_ids!: number[];
}
