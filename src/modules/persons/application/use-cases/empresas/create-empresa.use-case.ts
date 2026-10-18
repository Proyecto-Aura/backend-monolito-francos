import { Injectable } from '@nestjs/common';
import { CreateEmpresaDto } from '../../dto/empresa-dtos/create-empresa.dto';
import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import { ResourceConflictError } from '../../../domain/errors/persons-domain.errors';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';

@Injectable()
export class CreateEmpresaUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async execute(dto: CreateEmpresaDto): Promise<EmpresaEntity> {
    const rucExists = await this.empresaRepository.existsByRuc(dto.ruc);

    if (rucExists) {
      throw new ResourceConflictError('Ya existe una empresa con ese RUC');
    }

    if (dto.email && (await this.empresaRepository.existsByEmail(dto.email))) {
      throw new ResourceConflictError('Ya existe una empresa con ese email');
    }

    return this.empresaRepository.create({
      razon_social: dto.razon_social,
      ruc: dto.ruc,
      direccion: dto.direccion,
      telefono: dto.telefono ?? null,
      email: dto.email ?? null,
      logo_url: dto.logo_url ?? null,
      estado: dto.estado ?? true,
      es_emisora: false,
    });
  }
}
