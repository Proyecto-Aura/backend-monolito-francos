import { ValidateIf, IsInt, IsPositive } from 'class-validator';

export class MoveRutaDto {
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsInt()
  @IsPositive()
  parent_id!: number | null;
}
