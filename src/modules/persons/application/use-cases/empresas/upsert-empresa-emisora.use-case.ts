import { Injectable } from '@nestjs/common';
import { UpsertEmpresaEmisoraDto } from '../../dto/empresa-dtos/upsert-empresa-emisora.dto';
import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import { ResourceConflictError } from '../../../domain/errors/persons-domain.errors';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';

@Injectable()
export class UpsertEmpresaEmisoraUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async execute(dto: UpsertEmpresaEmisoraDto): Promise<EmpresaEntity> {
    const emisora = await this.empresaRepository.findEmisora();
    const excludeId = emisora?.id;

    if (await this.empresaRepository.existsByRuc(dto.ruc, excludeId)) {
      throw new ResourceConflictError('Ya existe una empresa con ese RUC');
    }

    if (
      dto.email &&
      (await this.empresaRepository.existsByEmail(dto.email, excludeId))
    ) {
      throw new ResourceConflictError('Ya existe una empresa con ese email');
    }

    // PUT reemplaza: un opcional que no llega queda en null.
    const datos = {
      razon_social: dto.razon_social,
      ruc: dto.ruc,
      direccion: dto.direccion,
      telefono: dto.telefono ?? null,
      email: dto.email ?? null,
      logo_url: dto.logo_url ?? null,
    };

    if (!emisora) {
      return this.empresaRepository.create({
        ...datos,
        estado: true,
        es_emisora: true,
      });
    }

    return this.empresaRepository.update(emisora.id, datos);
  }
}
