import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreateAccesoDto {
  @IsInt()
  @IsPositive()
  rol_id!: number;

  @IsInt()
  @IsPositive()
  ruta_id!: number;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
