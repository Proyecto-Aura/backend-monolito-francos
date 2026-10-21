import { IsString, validate } from 'class-validator';
import { Match } from './match.validator';

class PasswordConfirmationDto {
  @IsString()
  nueva_contrasena!: string;

  @Match('nueva_contrasena')
  confirmar_contrasena!: string;
}

describe('Match', () => {
  it('acepta campos con el mismo valor', async () => {
    const dto = new PasswordConfirmationDto();
    dto.nueva_contrasena = 'ClaveSegura123';
    dto.confirmar_contrasena = 'ClaveSegura123';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rechaza campos con valores distintos', async () => {
    const dto = new PasswordConfirmationDto();
    dto.nueva_contrasena = 'ClaveSegura123';
    dto.confirmar_contrasena = 'OtraClave123';

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('customValidation');
  });
});
