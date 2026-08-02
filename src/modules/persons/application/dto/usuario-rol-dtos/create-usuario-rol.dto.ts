import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';

export class CreateUsuarioRolDto {
  @IsUUID('4')
  user_id!: string;

  @IsInt()
  @IsPositive()
  rol_id!: number;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
