import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';
import { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { SubirLogoEmpresaEmisoraUseCase } from './subir-logo-empresa-emisora.use-case';

jest.mock('../../../../../config/envs', () => ({
  envs: { mediaBaseUrl: 'http://media.test/francos-media' },
}));

const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

const archivo = (buffer: Buffer, size = buffer.length) =>
  ({ buffer, size }) as Express.Multer.File;

describe('SubirLogoEmpresaEmisoraUseCase', () => {
  let empresaRepository: jest.Mocked<
    Pick<EmpresaRepository, 'findEmisora' | 'update'>
  >;
  let s3Service: { upload: jest.Mock; delete: jest.Mock };
  let useCase: SubirLogoEmpresaEmisoraUseCase;
  const emisora = { id: 7 } as EmpresaEntity;

  beforeEach(() => {
    empresaRepository = {
      findEmisora: jest.fn().mockResolvedValue(emisora),
      update: jest
        .fn()
        .mockImplementation(
          (id: number, datos: Partial<EmpresaEntity>): EmpresaEntity => ({
            ...emisora,
            id,
            ...datos,
          }),
        ),
    };
    s3Service = {
      upload: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn(),
    };
    useCase = new SubirLogoEmpresaEmisoraUseCase(
      empresaRepository as unknown as EmpresaRepository,
      s3Service as unknown as S3Service,
    );
  });

  it('sube un PNG al bucket media y guarda la URL en logo_url', async () => {
    const empresa = await useCase.execute(archivo(PNG));

    const [bucket, key, body, mime] = s3Service.upload.mock.calls[0] as [
      string,
      string,
      Buffer,
      string,
    ];
    expect(bucket).toBe('media');
    expect(key).toMatch(/^empresa\/[0-9a-f-]{36}\.png$/);
    expect(body).toBe(PNG);
    expect(mime).toBe('image/png');
    expect(empresaRepository.update).toHaveBeenCalledWith(7, {
      logo_url: `http://media.test/francos-media/${key}`,
    });
    expect(empresa.logo_url).toBe(`http://media.test/francos-media/${key}`);
  });

  it('acepta JPG con extensión jpg', async () => {
    await useCase.execute(archivo(JPG));

    const [, key, , mime] = s3Service.upload.mock.calls[0] as [
      string,
      string,
      Buffer,
      string,
    ];
    expect(key).toMatch(/\.jpg$/);
    expect(mime).toBe('image/jpeg');
  });

  it('rechaza un archivo que no es PNG ni JPG aunque lo declare', async () => {
    const webp = Buffer.from('RIFF0000WEBPVP8 ', 'ascii');

    await expect(useCase.execute(archivo(webp))).rejects.toThrow(
      new InvalidRequestError('El logo debe ser PNG o JPG'),
    );
    expect(s3Service.upload).not.toHaveBeenCalled();
    expect(empresaRepository.update).not.toHaveBeenCalled();
  });

  it('rechaza un logo de más de 1 MB', async () => {
    await expect(
      useCase.execute(archivo(PNG, 1024 * 1024 + 1)),
    ).rejects.toThrow(new InvalidRequestError('El logo no debe superar 1 MB'));
    expect(s3Service.upload).not.toHaveBeenCalled();
  });

  it('falla con 404 de dominio si aún no hay empresa emisora', async () => {
    empresaRepository.findEmisora.mockResolvedValue(null);

    await expect(useCase.execute(archivo(PNG))).rejects.toThrow(
      ResourceNotFoundError,
    );
    expect(s3Service.upload).not.toHaveBeenCalled();
  });

  it('no borra el logo anterior al reemplazarlo', async () => {
    await useCase.execute(archivo(PNG));

    expect(s3Service.delete).not.toHaveBeenCalled();
  });
});
