import { Injectable } from '@nestjs/common';
import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';

@Injectable()
export class GetEmpresaEmisoraUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async execute(): Promise<EmpresaEntity> {
    const emisora = await this.empresaRepository.findEmisora();
    if (!emisora) {
      throw new ResourceNotFoundError('Empresa emisora no configurada');
    }
    return emisora;
  }
}
