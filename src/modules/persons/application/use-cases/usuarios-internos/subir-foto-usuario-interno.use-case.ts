import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { envs } from '../../../../../config/envs';
import { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { UsuarioInterno } from '../../../domain/repositories/types/usuario-interno-repository.types';

export const TAMANO_MAXIMO_FOTO_USUARIO = 1024 * 1024;

// Cada foto tiene una key única, por eso el navegador puede guardarla un año
// sin revalidar.
const CACHE_CONTROL_FOTO = 'public, max-age=31536000, immutable';

interface TipoFoto {
  mime: string;
  extension: string;
}

// El tipo con el que se guarda la foto sale de los primeros bytes del archivo
// y no del Content-Type que manda el navegador, que el cliente puede falsear.
function detectarTipoFoto(buffer: Buffer): TipoFoto | null {
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
export class SubirFotoUsuarioInternoUseCase {
  constructor(
    private readonly usuarioInternoRepository: UsuarioInternoRepository,
    private readonly personaRepository: PersonaRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(
    id: string,
    foto: Express.Multer.File,
  ): Promise<UsuarioInterno> {
    const usuario = await this.usuarioInternoRepository.findById(id);
    if (!usuario) {
      throw new ResourceNotFoundError('Usuario no encontrado');
    }

    if (foto.size > TAMANO_MAXIMO_FOTO_USUARIO) {
      throw new InvalidRequestError('La foto no debe superar 1 MB');
    }

    const tipo = detectarTipoFoto(foto.buffer);
    if (!tipo) {
      throw new InvalidRequestError('La foto debe ser PNG o JPG');
    }

    // Al reemplazar se sube una key nueva; la foto anterior no se borra porque
    // el backend no tiene permiso de borrado sobre francos-media.
    const key = `usuarios/${randomUUID()}.${tipo.extension}`;

    await this.s3Service.upload(
      'media',
      key,
      foto.buffer,
      tipo.mime,
      CACHE_CONTROL_FOTO,
    );

    await this.personaRepository.update(usuario.persona.id, {
      foto_url: `${envs.mediaBaseUrl}/${key}`,
    });

    const actualizado = await this.usuarioInternoRepository.findById(id);
    if (!actualizado) {
      throw new ResourceNotFoundError('Usuario no encontrado');
    }
    return actualizado;
  }
}
