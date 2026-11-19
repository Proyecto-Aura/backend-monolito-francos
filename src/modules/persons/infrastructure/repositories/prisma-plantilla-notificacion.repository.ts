import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PlantillaNotificacionEntity } from '../../domain/entities/plantilla-notificacion.entity';
import { PlantillaNotificacionClave } from '../../domain/enums/persons.enums';
import { PlantillaNotificacionRepository } from '../../domain/repositories/plantilla-notificacion.repository';
import { UpdatePlantillaNotificacionParams } from '../../domain/repositories/types/plantilla-notificacion-repository.types';
import { PlantillaNotificacionMapper } from '../mappers/plantilla-notificacion.mapper';

@Injectable()
export class PrismaPlantillaNotificacionRepository implements PlantillaNotificacionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PlantillaNotificacionEntity[]> {
    const plantillas = await this.prisma.plantillaNotificacion.findMany({
      orderBy: { nombre: 'asc' },
    });
    return plantillas.map((plantilla) =>
      PlantillaNotificacionMapper.toDomain(plantilla),
    );
  }

  async findByClave(
    clave: PlantillaNotificacionClave,
  ): Promise<PlantillaNotificacionEntity | null> {
    const plantilla = await this.prisma.plantillaNotificacion.findUnique({
      where: { clave },
    });
    return plantilla ? PlantillaNotificacionMapper.toDomain(plantilla) : null;
  }

  async update(
    clave: PlantillaNotificacionClave,
    params: UpdatePlantillaNotificacionParams,
  ): Promise<PlantillaNotificacionEntity> {
    const plantilla = await this.prisma.plantillaNotificacion.update({
      where: { clave },
      data: params,
    });
    return PlantillaNotificacionMapper.toDomain(plantilla);
  }
}
