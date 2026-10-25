import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { envs } from '../../../../../config/envs';
import { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';

export const TAMANO_MAXIMO_LOGO = 1024 * 1024;

// Cada logo tiene una key única, por eso el navegador puede guardarlo un año
// sin revalidar.
const CACHE_CONTROL_LOGO = 'public, max-age=31536000, immutable';

interface TipoLogo {
  mime: string;
  extension: string;
}

// El tipo con el que se guarda el logo sale de los primeros bytes del archivo
// y no del Content-Type que manda el navegador, que el cliente puede falsear.
function detectarTipoLogo(buffer: Buffer): TipoLogo | null {
  const empieza = (...bytes: number[]) =>
    buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b);

  if (empieza(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { mime: 'image/png', extension: 'png' };
  }
  if (empieza(0xff, 0xd8, 0xff)) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  return null;
}

@Injectable()
export class SubirLogoEmpresaEmisoraUseCase {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(logo: Express.Multer.File): Promise<EmpresaEntity> {
    const emisora = await this.empresaRepository.findEmisora();
    if (!emisora) {
      throw new ResourceNotFoundError(
        'Registra primero los datos de la empresa',
      );
    }

    if (logo.size > TAMANO_MAXIMO_LOGO) {
      throw new InvalidRequestError('El logo no debe superar 1 MB');
    }

    const tipo = detectarTipoLogo(logo.buffer);
    if (!tipo) {
      throw new InvalidRequestError('El logo debe ser PNG o JPG');
    }

    // Al reemplazar se sube una key nueva; el logo anterior no se borra porque
    // el backend no tiene permiso de borrado sobre francos-media.
    const key = `empresa/${randomUUID()}.${tipo.extension}`;

    await this.s3Service.upload(
      'media',
      key,
      logo.buffer,
      tipo.mime,
      CACHE_CONTROL_LOGO,
    );

    return this.empresaRepository.update(emisora.id, {
      logo_url: `${envs.mediaBaseUrl}/${key}`,
    });
  }
}
