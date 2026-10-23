import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class ListProvinciasQueryDto {
  @ApiProperty({ example: '15', description: 'Código del departamento' })
  @Matches(/^\d{2}$/, { message: 'departamento_id debe tener 2 dígitos' })
  departamento_id!: string;
}

export class ListDistritosQueryDto {
  @ApiProperty({ example: '1501', description: 'Código de la provincia' })
  @Matches(/^\d{4}$/, { message: 'provincia_id debe tener 4 dígitos' })
  provincia_id!: string;
}
