import { Empleado as PrismaEmpleado } from '@prisma/client';
import { EmpleadoEntity } from '../../domain/entities/empleado.entity';
import { AreaEmpleado } from '../../domain/enums/persons.enums';

export class EmpleadoMapper {
  static toDomain(empleado: PrismaEmpleado): EmpleadoEntity {
    return new EmpleadoEntity(
      empleado.id,
      empleado.persona_id,
      empleado.cargo,
      empleado.area as AreaEmpleado | null,
      empleado.fecha_ingreso,
      empleado.fecha_des_lab,
      empleado.estado,
      empleado.created_at,
      empleado.updated_at,
    );
  }
}
