import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class RegistrarKpiValorDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio!: number;

  @ApiProperty({ type: Number, example: 3 })
  @Type(() => Number)
  @IsInt()
  periodo_id!: number;

  @ApiProperty({ example: 18.5 })
  @IsNumber()
  valor!: number;
}
