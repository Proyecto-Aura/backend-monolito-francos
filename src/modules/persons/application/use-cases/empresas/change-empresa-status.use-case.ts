import { Injectable } from '@nestjs/common';
import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';

@Injectable()
export class ChangeEmpresaStatusUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async execute(id: number, estado: boolean): Promise<EmpresaEntity> {
    const empresa = await this.empresaRepository.findById(id);
    if (!empresa) throw new ResourceNotFoundError('Empresa no encontrada');
    return this.empresaRepository.setStatus(id, estado);
  }
}
