import { registerDecorator, ValidationOptions } from 'class-validator';

// Prefijos de RUC vigentes en SUNAT: 10 persona natural, 15 y 17 casos
// especiales, 20 persona jurídica.
const PREFIJOS_RUC = ['10', '15', '17', '20'];
const PESOS_RUC = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

// RUC peruano: 11 dígitos, prefijo válido y dígito verificador módulo 11.
export function esRucValido(ruc: unknown): boolean {
  if (typeof ruc !== 'string' || !/^\d{11}$/.test(ruc)) return false;
  if (!PREFIJOS_RUC.includes(ruc.slice(0, 2))) return false;

  const suma = PESOS_RUC.reduce(
    (total, peso, i) => total + peso * Number(ruc[i]),
    0,
  );
  // 11 - (suma % 11) da 1..11; 10 y 11 se reducen a 0 y 1.
  const verificador = (11 - (suma % 11)) % 10;

  return verificador === Number(ruc[10]);
}

export function IsRuc(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRuc',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} no es un RUC válido`,
        ...options,
      },
      validator: { validate: (value: unknown) => esRucValido(value) },
    });
  };
}
