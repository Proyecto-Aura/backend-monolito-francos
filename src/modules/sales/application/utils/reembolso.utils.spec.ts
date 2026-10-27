import {
  formatCodigoReembolso,
  keyEvidenciaReembolso,
  nombreArchivoEvidencia,
} from './reembolso.utils';

describe('reembolso.utils', () => {
  describe('formatCodigoReembolso', () => {
    it('rellena con ceros hasta 6 dígitos, como el seed', () => {
      expect(formatCodigoReembolso(1)).toBe('SOL-000001');
      expect(formatCodigoReembolso(4182)).toBe('SOL-004182');
    });

    it('no corta ids de más de 6 dígitos', () => {
      expect(formatCodigoReembolso(1234567)).toBe('SOL-1234567');
    });
  });

  describe('nombreArchivoEvidencia', () => {
    it('quita tildes, espacios y caracteres raros', () => {
      expect(
        nombreArchivoEvidencia('Acta de recepción (1).PDF', 'application/pdf'),
      ).toBe('Acta-de-recepcion-1-.PDF');
    });

    it('descarta cualquier ruta del nombre', () => {
      expect(
        nombreArchivoEvidencia('../../secretos/foto.png', 'image/png'),
      ).toBe('foto.png');
      expect(
        nombreArchivoEvidencia('C:\\Users\\rosa\\foto.jpg', 'image/jpeg'),
      ).toBe('foto.jpg');
    });

    it('sin nada utilizable usa un nombre por defecto según el tipo', () => {
      expect(nombreArchivoEvidencia('¿?', 'image/webp')).toBe('evidencia.webp');
      expect(nombreArchivoEvidencia('', 'application/pdf')).toBe(
        'evidencia.pdf',
      );
    });

    it('limita la longitud y conserva la extensión', () => {
      const nombre = nombreArchivoEvidencia(
        `${'a'.repeat(300)}.pdf`,
        'application/pdf',
      );

      expect(nombre).toHaveLength(100);
      expect(nombre.endsWith('.pdf')).toBe(true);
    });
  });

  it('keyEvidenciaReembolso arma reembolsos/<codigo>/<nombre>', () => {
    expect(keyEvidenciaReembolso('SOL-000007', 'acta.pdf')).toBe(
      'reembolsos/SOL-000007/acta.pdf',
    );
  });
});
