import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CrearDetalleLineaDto {
  @ApiProperty({
    example: 256,
    minimum: 1,
    description: 'Id de producto_terminado',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_terminado_id!: number;

  @ApiProperty({ example: 50, minimum: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cantidad_solicitada!: number;
}
