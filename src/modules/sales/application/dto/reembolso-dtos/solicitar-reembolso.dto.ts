import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// HU-B-014 (RF-B39): llega como multipart junto con el archivo `evidencia`,
// por eso el id del pedido viene como texto. El cliente sale del JWT.
export class SolicitarReembolsoDto {
  @ApiProperty({ type: Number, example: 12, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  pedido_id: number;

  @ApiProperty({ example: 'Producto en mal estado', maxLength: 150 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  motivo: string;

  @ApiProperty({
    example: 'Llegaron 4 packs de canchita con la bolsa rota.',
    minLength: 10,
    maxLength: 1000,
  })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  descripcion: string;
}
