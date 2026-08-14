import { Injectable } from '@nestjs/common';
import { UpdateEmpresaDto } from '../../dto/empresa-dtos/update-empresa.dto';
import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';

@Injectable()
export class UpdateEmpresaUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async execute(id: number, dto: UpdateEmpresaDto): Promise<EmpresaEntity> {
    const empresa = await this.empresaRepository.findById(id);
    if (!empresa) throw new ResourceNotFoundError('Empresa no encontrada');

    if (
      dto.ruc &&
      dto.ruc !== empresa.ruc &&
      (await this.empresaRepository.existsByRuc(dto.ruc, id))
    ) {
      throw new ResourceConflictError('Ya existe una empresa con ese RUC');
    }

    if (
      dto.email &&
      dto.email !== empresa.email &&
      (await this.empresaRepository.existsByEmail(dto.email, id))
    ) {
      throw new ResourceConflictError('Ya existe una empresa con ese email');
    }

    return this.empresaRepository.update(id, {
      razon_social: dto.razon_social,
      ruc: dto.ruc,
      direccion: dto.direccion,
      telefono: dto.telefono,
      email: dto.email,
      logo_url: dto.logo_url,
    });
  }
}
