import { Injectable } from '@nestjs/common';
import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';

@Injectable()
export class ChangeEmpresaStatusUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async execute(id: number, estado: boolean): Promise<EmpresaEntity> {
    const empresa = await this.empresaRepository.findById(id);
    if (!empresa) throw new ResourceNotFoundError('Empresa no encontrada');
    if (!estado && empresa.es_emisora) {
      throw new ResourceConflictError(
        'No se puede desactivar la empresa emisora',
      );
    }
    return this.empresaRepository.setStatus(id, estado);
  }
}
