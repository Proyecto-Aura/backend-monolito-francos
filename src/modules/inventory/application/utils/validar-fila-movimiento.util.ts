import { BadRequestException, ValidationPipe } from '@nestjs/common';

// El body de entrada/salida/ajuste puede ser un objeto único o un array de
// filas (para guardar varias en una sola transacción). El ValidationPipe
// global no soporta esa forma polimórfica, así que acá se valida cada fila a
// mano contra su DTO, reusando la misma config (whitelist/transform) que el
// pipe global para que los errores se vean igual.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

export async function validarFila<T extends object>(
  metatype: new () => T,
  value: unknown,
): Promise<T> {
  return pipe.transform(value, {
    type: 'body',
    metatype,
  }) as Promise<T>;
}

export async function validarFilas<T extends object>(
  metatype: new () => T,
  filas: unknown[],
): Promise<T[]> {
  if (filas.length === 0) {
    throw new BadRequestException('Debe incluir al menos una fila');
  }
  return Promise.all(filas.map((fila) => validarFila(metatype, fila)));
}
