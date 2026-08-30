import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  IsUrl,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductoPresentacionDto {
  @ApiPropertyOptional({ example: 8.5, minimum: 0.01 })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio_unitario?: number;

  @ApiPropertyOptional({ example: 7.5, minimum: 0.01, nullable: true })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio_mayorista?: number | null;

  @ApiPropertyOptional({ example: 12, minimum: 1, nullable: true })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  umbral_mayorista?: number | null;

  @ApiPropertyOptional({ example: 'https://example.com/producto.jpg' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsUrl()
  imagen_url?: string;
}
