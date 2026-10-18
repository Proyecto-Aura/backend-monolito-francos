import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class ListPeriodosQueryDto {
  @ApiProperty({ type: Number, example: 3 })
  @Type(() => Number)
  @IsInt()
  frecuencia_id!: number;
}
