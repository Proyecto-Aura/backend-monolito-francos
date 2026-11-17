import { ResourceConflictError } from '../../../domain/errors/persons-domain.errors';
import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';
import { UpsertEmpresaEmisoraDto } from '../../dto/empresa-dtos/upsert-empresa-emisora.dto';
import { UpsertEmpresaEmisoraUseCase } from './upsert-empresa-emisora.use-case';

describe('UpsertEmpresaEmisoraUseCase', () => {
  const findEmisora = jest.fn();
  const existsByRuc = jest.fn();
  const existsByEmail = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const repository = {
    findEmisora,
    existsByRuc,
    existsByEmail,
    create,
    update,
  } as unknown as jest.Mocked<EmpresaRepository>;
  const useCase = new UpsertEmpresaEmisoraUseCase(repository);

  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const emisora = new EmpresaEntity(
    7,
    'Franco SAC',
    '20123456789',
    'Av. Siempre Viva 123',
    null,
    'contacto@franco.pe',
    null,
    true,
    true,
    fecha,
    fecha,
  );
  const dto: UpsertEmpresaEmisoraDto = {
    razon_social: 'Franco SAC',
    ruc: '20123456789',
    direccion: 'Av. Siempre Viva 123',
    email: 'contacto@franco.pe',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    existsByRuc.mockResolvedValue(false);
    existsByEmail.mockResolvedValue(false);
  });

  it('crea la emisora activa si todavía no existe', async () => {
    findEmisora.mockResolvedValue(null);
    create.mockResolvedValue(emisora);

    await useCase.execute(dto);

    expect(existsByRuc).toHaveBeenCalledWith(dto.ruc, undefined);
    expect(create).toHaveBeenCalledWith({
      razon_social: dto.razon_social,
      ruc: dto.ruc,
      direccion: dto.direccion,
      telefono: null,
      email: dto.email,
      logo_url: null,
      estado: true,
      es_emisora: true,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('actualiza la emisora existente y deja en null los opcionales omitidos pero conserva el logo', async () => {
    findEmisora.mockResolvedValue(emisora);
    update.mockResolvedValue(emisora);

    await useCase.execute({
      razon_social: 'Franco Nuevo SAC',
      ruc: '20123456789',
      direccion: 'Jr. Nuevo 456',
    });

    expect(update).toHaveBeenCalledWith(7, {
      razon_social: 'Franco Nuevo SAC',
      ruc: '20123456789',
      direccion: 'Jr. Nuevo 456',
      telefono: null,
      email: null,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('permite conservar su propio RUC y email (excluye su id al validar)', async () => {
    findEmisora.mockResolvedValue(emisora);
    update.mockResolvedValue(emisora);

    await useCase.execute(dto);

    expect(existsByRuc).toHaveBeenCalledWith(dto.ruc, 7);
    expect(existsByEmail).toHaveBeenCalledWith(dto.email, 7);
    expect(update).toHaveBeenCalled();
  });

  it('lanza 409 si el RUC pertenece a otra empresa', async () => {
    findEmisora.mockResolvedValue(emisora);
    existsByRuc.mockResolvedValue(true);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el email pertenece a otra empresa', async () => {
    findEmisora.mockResolvedValue(null);
    existsByEmail.mockResolvedValue(true);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
