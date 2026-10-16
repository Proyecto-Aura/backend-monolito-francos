import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function Match(property: string, options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [property],
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const relatedProperty = (args.constraints as string[])[0];
          return (
            value === (args.object as Record<string, unknown>)[relatedProperty]
          );
        },
        defaultMessage(args: ValidationArguments): string {
          const relatedProperty = (args.constraints as string[])[0];
          return `${args.property} debe coincidir con ${relatedProperty}`;
        },
      },
    });
  };
}
