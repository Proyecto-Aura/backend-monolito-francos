import { Injectable } from '@nestjs/common';
import { CreateEmpleadoDto } from '../../dto/empleado-dtos/create-empleado.dto';
import { ListEmpleadosQueryDto } from '../../dto/empleado-dtos/list-empleados-query.dto';
import { UpdateEmpleadoDto } from '../../dto/empleado-dtos/update-empleado.dto';
import { EmpleadoEntity } from '../../../domain/entities/empleado.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { EmpleadoRepository } from '../../../domain/repositories/empleado.repository';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';

@Injectable()
export class CreateEmpleadoUseCase {
  constructor(
    private readonly empleadoRepository: EmpleadoRepository,
    private readonly personaRepository: PersonaRepository,
  ) {}

  async execute(dto: CreateEmpleadoDto): Promise<EmpleadoEntity> {
    const persona = await this.personaRepository.findById(dto.persona_id);
    if (!persona || !persona.estado) {
      throw new ResourceNotFoundError('La persona no existe o está inactiva');
    }
    if (await this.empleadoRepository.existsByPersonaId(dto.persona_id)) {
      throw new ResourceConflictError(
        'La persona ya tiene un perfil de empleado',
      );
    }
    return this.empleadoRepository.create({
      persona_id: dto.persona_id,
      cargo: dto.cargo ?? null,
      area: dto.area ?? null,
      fecha_ingreso: dto.fecha_ingreso ? new Date(dto.fecha_ingreso) : null,
      fecha_des_lab: dto.fecha_des_lab ? new Date(dto.fecha_des_lab) : null,
      estado: dto.estado ?? true,
    });
  }
}

@Injectable()
export class GetEmpleadoByIdUseCase {
  constructor(private readonly empleadoRepository: EmpleadoRepository) {}
  async execute(id: string): Promise<EmpleadoEntity> {
    const empleado = await this.empleadoRepository.findById(id);
    if (!empleado) throw new ResourceNotFoundError('Empleado no encontrado');
    return empleado;
  }
}

@Injectable()
export class ListEmpleadosUseCase {
  constructor(private readonly empleadoRepository: EmpleadoRepository) {}
  execute(
    dto: ListEmpleadosQueryDto,
  ): Promise<PaginatedResult<EmpleadoEntity>> {
    return this.empleadoRepository.findMany(dto);
  }
}

@Injectable()
export class UpdateEmpleadoUseCase {
  constructor(private readonly empleadoRepository: EmpleadoRepository) {}
  async execute(id: string, dto: UpdateEmpleadoDto): Promise<EmpleadoEntity> {
    const empleado = await this.empleadoRepository.findById(id);
    if (!empleado) throw new ResourceNotFoundError('Empleado no encontrado');
    return this.empleadoRepository.update(id, {
      cargo: dto.cargo,
      area: dto.area,
      fecha_ingreso: dto.fecha_ingreso
        ? new Date(dto.fecha_ingreso)
        : undefined,
      fecha_des_lab: dto.fecha_des_lab
        ? new Date(dto.fecha_des_lab)
        : undefined,
    });
  }
}

@Injectable()
export class ChangeEmpleadoStatusUseCase {
  constructor(private readonly empleadoRepository: EmpleadoRepository) {}
  async execute(id: string, estado: boolean): Promise<EmpleadoEntity> {
    const empleado = await this.empleadoRepository.findById(id);
    if (!empleado) throw new ResourceNotFoundError('Empleado no encontrado');
    return this.empleadoRepository.setStatus(id, estado);
  }
}
