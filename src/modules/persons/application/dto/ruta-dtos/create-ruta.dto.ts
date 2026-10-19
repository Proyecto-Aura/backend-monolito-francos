import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRutaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  etiqueta!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  icono!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  parent_id?: number;
}
