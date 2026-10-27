import { Injectable } from '@nestjs/common';
import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';

@Injectable()
export class QuitarLogoEmpresaEmisoraUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async execute(): Promise<EmpresaEntity> {
    const emisora = await this.empresaRepository.findEmisora();
    if (!emisora) {
      throw new ResourceNotFoundError('Empresa emisora no configurada');
    }

    // Solo se desvincula: el archivo queda en francos-media porque el backend
    // no tiene permiso de borrado sobre ese bucket.
    return this.empresaRepository.update(emisora.id, { logo_url: null });
  }
}
