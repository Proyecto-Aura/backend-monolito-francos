import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDocumentoEstrategicoDto {
  @ApiProperty({ type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  plan_estrategico_id!: number;

  @ApiProperty({ example: 'Informe de diagnóstico 2026', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;
}
