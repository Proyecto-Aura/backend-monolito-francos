import { Injectable } from '@nestjs/common';
import { PlantillaNotificacionEntity } from '../../../domain/entities/plantilla-notificacion.entity';
import { PlantillaNotificacionClave } from '../../../domain/enums/persons.enums';
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { PlantillaNotificacionRepository } from '../../../domain/repositories/plantilla-notificacion.repository';
import { UpdatePlantillaNotificacionDto } from '../../dto/parametros-notificaciones-dtos/update-plantilla-notificacion.dto';

const PLACEHOLDER_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

@Injectable()
export class UpdatePlantillaNotificacionUseCase {
  constructor(
    private readonly plantillaNotificacionRepository: PlantillaNotificacionRepository,
  ) {}

  async execute(
    clave: PlantillaNotificacionClave,
    dto: UpdatePlantillaNotificacionDto,
  ): Promise<PlantillaNotificacionEntity> {
    const plantilla =
      await this.plantillaNotificacionRepository.findByClave(clave);
    if (!plantilla) {
      throw new ResourceNotFoundError(
        'Plantilla de notificación no encontrada',
      );
    }

    const asunto = dto.asunto ?? plantilla.asunto;
    const cuerpo = dto.cuerpo ?? plantilla.cuerpo;
    this.validarPlaceholders(asunto, plantilla.variables);
    this.validarPlaceholders(cuerpo, plantilla.variables);

    return this.plantillaNotificacionRepository.update(clave, dto);
  }

  // Evita que el admin deje un {{variable}} mal escrito o inexistente: la
  // notificación real nunca lo reemplazaría y saldría literal en el correo.
  private validarPlaceholders(texto: string, variables: string[]): void {
    const usados = [...texto.matchAll(PLACEHOLDER_PATTERN)].map(
      (match) => match[1],
    );
    const desconocidos = usados.filter(
      (variable) => !variables.includes(variable),
    );
    if (desconocidos.length > 0) {
      throw new InvalidRequestError(
        `Variables no válidas para esta plantilla: ${desconocidos.join(', ')}. Disponibles: ${variables.join(', ')}`,
      );
    }
  }
}
