import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { TipoDocumento } from '@prisma/client';

const FORMATOS: Record<TipoDocumento, RegExp> = {
  [TipoDocumento.dni]: /^\d{8}$/,
  [TipoDocumento.ruc]: /^\d{11}$/,
  [TipoDocumento.ce]: /^[a-zA-Z0-9]{9,12}$/,
  [TipoDocumento.pasaporte]: /^[a-zA-Z0-9]{6,12}$/,
};

@ValidatorConstraint({ name: 'numeroDocumentoValido', async: false })
class NumeroDocumentoValidoConstraint implements ValidatorConstraintInterface {
  validate(numeroDocumento: string, args: ValidationArguments): boolean {
    const tipo = (args.object as { tipo_documento?: TipoDocumento })
      .tipo_documento;
    if (!tipo || typeof numeroDocumento !== 'string') return true;
    return FORMATOS[tipo].test(numeroDocumento);
  }

  defaultMessage(args: ValidationArguments): string {
    const tipo = (args.object as { tipo_documento?: TipoDocumento })
      .tipo_documento;
    return `numero_documento no tiene un formato válido para tipo_documento "${tipo}"`;
  }
}

export function IsNumeroDocumentoValido(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: NumeroDocumentoValidoConstraint,
    });
  };
}
