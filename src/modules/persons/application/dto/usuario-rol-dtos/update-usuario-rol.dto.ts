import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUsuarioRolDto {
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
