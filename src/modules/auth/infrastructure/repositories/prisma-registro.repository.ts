import { Injectable } from "@nestjs/common";
import { RegistroRepository } from "../../domain/repositories/registro.repository";
import { RegisterClienteParams, RegistroClienteResult, RegisterEmpleadoParams, RegistroEmpleadoResult } from "../../domain/repositories/types/registro-repository.types";
import { PrismaService } from "../../../../infrastructure/database/prisma/prisma.service";
import { PersonaMapper } from '../../../persons/infrastructure/mappers/persona.mapper';
import { ClienteMapper } from '../../../persons/infrastructure/mappers/cliente.mapper';
import { EmpleadoMapper } from '../../../persons/infrastructure/mappers/empleado.mapper';
import { UserMapper } from '../../../persons/infrastructure/mappers/user.mapper';


@Injectable()
export class PrismaRegistroRepository implements RegistroRepository {
    constructor(private readonly prisma: PrismaService) { }
    registerCliente(params: RegisterClienteParams): Promise<RegistroClienteResult> {
        return this.prisma.$transaction(async (tx) => {
            const persona = await tx.persona.create({
                data: params.persona
            });
            const cliente = await tx.cliente.create({
                data: { persona_id: persona.id, ...params.cliente }
            });
            const { contrasena_hash, ...rest_data } = params.user;
            const user = await tx.user.create({
                data: { persona_id: persona.id, contrasena: contrasena_hash, ...rest_data }
            });
            await tx.usuarioRol.create({
                data: { user_id: user.id, rol_id: params.rol_id },
            })

            return {
                persona: PersonaMapper.toDomain(persona),
                cliente: ClienteMapper.toDomain(cliente),
                user: UserMapper.toDomain(user),
            };
        })
    }
    registerEmpleado(params: RegisterEmpleadoParams): Promise<RegistroEmpleadoResult> {
        return this.prisma.$transaction(async (tx) => {
            const persona = await tx.persona.create({
                data: params.persona
            });
            const empleado = await tx.empleado.create({
                data: { persona_id: persona.id, ...params.empleado }
            });
            const { contrasena_hash, ...rest_data } = params.user;
            const user = await tx.user.create({
                data: { persona_id: persona.id, contrasena: contrasena_hash, ...rest_data }
            });
            await tx.usuarioRol.create({
                data: { user_id: user.id, rol_id: params.rol_id }
            });
            return {
                persona: PersonaMapper.toDomain(persona),
                empleado: EmpleadoMapper.toDomain(empleado),
                user: UserMapper.toDomain(user),
            };
        })
    }

}