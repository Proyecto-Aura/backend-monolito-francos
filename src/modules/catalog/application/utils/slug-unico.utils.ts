import { ResourceConflictError } from '../../domain/errors/catalog-domain.errors';

const LONGITUD_MAXIMA = 100;
const INTENTOS_MAXIMOS = 50;

// El slug no se edita, así que un producto renombrado conserva el del nombre
// original. Si luego se registra otro con ese nombre, el slug generado coincidiría
// con el existente: en ese caso se agrega un sufijo numérico (-2, -3...).
export async function resolverSlugUnico(
  base: string,
  existeSlug: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await existeSlug(base))) {
    return base;
  }

  for (let n = 2; n <= INTENTOS_MAXIMOS; n++) {
    const sufijo = `-${n}`;
    const candidato = `${base.slice(0, LONGITUD_MAXIMA - sufijo.length)}${sufijo}`;

    if (!(await existeSlug(candidato))) {
      return candidato;
    }
  }

  throw new ResourceConflictError(
    'No se pudo generar un identificador (slug) único para la presentación',
  );
}
