// El use-case importa S3Service, que importa config/envs; sin este mock la
// validación de Joi corre al importarse y explota en CI (no hay .env).
jest.mock('../../../../../config/envs', () => ({ envs: {} }));

import { BadRequestException } from '@nestjs/common';
import { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { ProductoPresentacionEntity } from '../../../domain/entities/producto_presentacion.entity';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { SubirImagenProductoPresentacionUseCase } from './subir-imagen-producto_presentacion.use-case';

describe('SubirImagenProductoPresentacionUseCase', () => {
  const findById = jest.fn();
  const update = jest.fn();
  const upload = jest.fn();

  const useCase = new SubirImagenProductoPresentacionUseCase(
    { findById, update } as unknown as ProductoPresentacionRepository,
    { upload } as unknown as S3Service,
  );

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const presentacion = new ProductoPresentacionEntity(
    7,
    'FR-P1-PR2',
    10,
    null,
    null,
    1,
    2,
    null,
    'chifles-p2',
    true,
    fecha,
    fecha,
  );

  // Firmas reales de cada formato (los primeros bytes del archivo).
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const WEBP = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x24, 0, 0, 0]),
    Buffer.from('WEBPVP8 '),
  ]);

  // `declarado` es el Content-Type que manda el navegador: no debe influir.
  const imagen = (buffer: Buffer, declarado = 'image/png') =>
    ({
      buffer,
      mimetype: declarado,
      originalname: 'foto.png',
    }) as Express.Multer.File;

  beforeEach(() => {
    jest.resetAllMocks();
    findById.mockResolvedValue(presentacion);
    upload.mockResolvedValue(undefined);
    update.mockImplementation((_id: number, params: { imagen_key: string }) =>
      Promise.resolve({ ...presentacion, imagen_key: params.imagen_key }),
    );
  });

  it('sube la imagen a media con una key nueva y guarda solo la key', async () => {
    const resultado = await useCase.execute(7, imagen(PNG));

    const [bucket, key, body, contentType, cacheControl] = upload.mock
      .calls[0] as [string, string, Buffer, string, string];
    expect(bucket).toBe('media');
    expect(key).toMatch(/^productos\/[0-9a-f-]{36}\.png$/);
    expect(body).toBe(PNG);
    expect(contentType).toBe('image/png');
    expect(cacheControl).toBe('public, max-age=31536000, immutable');
    expect(update).toHaveBeenCalledWith(7, { imagen_key: key });
    expect(resultado.imagen_key).toBe(key);
  });

  it.each([
    ['png', PNG, 'image/png'],
    ['jpg', JPG, 'image/jpeg'],
    ['webp', WEBP, 'image/webp'],
  ])(
    'usa la extensión y el tipo %s según los bytes',
    async (extension, buffer, mime) => {
      await useCase.execute(7, imagen(buffer));

      const [, key, , contentType] = upload.mock.calls[0] as [
        string,
        string,
        Buffer,
        string,
      ];
      expect(key.endsWith(`.${extension}`)).toBe(true);
      expect(contentType).toBe(mime);
    },
  );

  it('ignora el Content-Type declarado por el navegador', async () => {
    await useCase.execute(7, imagen(PNG, 'text/html'));

    const [, key, , contentType] = upload.mock.calls[0] as [
      string,
      string,
      Buffer,
      string,
    ];
    expect(contentType).toBe('image/png');
    expect(key.endsWith('.png')).toBe(true);
  });

  it('rechaza con 400 un archivo cuyos bytes no son JPG, PNG ni WEBP', async () => {
    await expect(
      useCase.execute(7, imagen(Buffer.from('<html></html>'), 'image/png')),
    ).rejects.toThrow(BadRequestException);
    expect(upload).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('al reemplazar sube otra key y no borra la anterior', async () => {
    findById.mockResolvedValue({
      ...presentacion,
      imagen_key: 'productos/anterior.jpg',
    });

    const resultado = await useCase.execute(7, imagen(JPG, 'image/jpeg'));

    expect(resultado.imagen_key).not.toBe('productos/anterior.jpg');
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('lanza 404 y no sube nada si la presentación no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(99, imagen(PNG))).rejects.toThrow(
      ResourceNotFoundError,
    );
    expect(upload).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
