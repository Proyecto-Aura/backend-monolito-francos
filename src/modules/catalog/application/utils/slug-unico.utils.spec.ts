import { ResourceConflictError } from '../../domain/errors/catalog-domain.errors';
import { resolverSlugUnico } from './slug-unico.utils';

describe('resolverSlugUnico', () => {
  const ocupados = (...slugs: string[]) =>
    jest.fn((slug: string) => Promise.resolve(slugs.includes(slug)));

  it('devuelve el slug tal cual si está libre', async () => {
    const existe = ocupados();

    await expect(resolverSlugUnico('chifles-100-gr-p1', existe)).resolves.toBe(
      'chifles-100-gr-p1',
    );
    expect(existe).toHaveBeenCalledTimes(1);
  });

  it('agrega -2 si el slug ya está ocupado', async () => {
    const existe = ocupados('chifles-100-gr-p1');

    await expect(resolverSlugUnico('chifles-100-gr-p1', existe)).resolves.toBe(
      'chifles-100-gr-p1-2',
    );
  });

  it('sigue con -3, -4... mientras los anteriores estén ocupados', async () => {
    const existe = ocupados(
      'chifles-100-gr-p1',
      'chifles-100-gr-p1-2',
      'chifles-100-gr-p1-3',
    );

    await expect(resolverSlugUnico('chifles-100-gr-p1', existe)).resolves.toBe(
      'chifles-100-gr-p1-4',
    );
  });

  it('recorta el slug base para que con el sufijo no pase de 100 caracteres', async () => {
    const base = 'a'.repeat(100);
    const existe = ocupados(base);

    const slug = await resolverSlugUnico(base, existe);

    expect(slug).toHaveLength(100);
    expect(slug.endsWith('-2')).toBe(true);
  });

  it('lanza un conflicto si no logra un slug libre', async () => {
    const existe = jest.fn(() => Promise.resolve(true));

    await expect(
      resolverSlugUnico('chifles-100-gr-p1', existe),
    ).rejects.toBeInstanceOf(ResourceConflictError);
  });
});
