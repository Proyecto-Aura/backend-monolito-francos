import { validate } from 'class-validator';
import { esRucValido, IsRuc } from './ruc.validator';

class RucDto {
  @IsRuc()
  ruc!: unknown;
}

describe('esRucValido', () => {
  it.each(['20100070970', '10123456781', '15123456782', '17123456785'])(
    'acepta el RUC %s',
    (ruc) => {
      expect(esRucValido(ruc)).toBe(true);
    },
  );

  it.each([
    ['menos de 11 dígitos', '2010007097'],
    ['más de 11 dígitos', '201000709701'],
    ['letras', '2010007097A'],
    ['un prefijo inválido', '30100070970'],
    ['el dígito verificador incorrecto', '20100070971'],
    ['espacios', ' 20100070970'],
  ])('rechaza %s', (_, ruc) => {
    expect(esRucValido(ruc)).toBe(false);
  });

  it.each([20100070970, null, undefined])('rechaza %p', (ruc) => {
    expect(esRucValido(ruc)).toBe(false);
  });
});

describe('IsRuc', () => {
  it('acepta un RUC válido', async () => {
    const dto = new RucDto();
    dto.ruc = '20601234565';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rechaza un RUC inválido con su mensaje', async () => {
    const dto = new RucDto();
    dto.ruc = '20601234566';

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      isRuc: 'ruc no es un RUC válido',
    });
  });
});
