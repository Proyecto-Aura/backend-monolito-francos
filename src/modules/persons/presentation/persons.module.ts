import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CreateRolUseCase } from '../application/use-cases/roles/create-rol.use-case';
import { GetRolByIdUseCase } from '../application/use-cases/roles/get-rol-by-id.use-case';
import { ListRolesUseCase } from '../application/use-cases/roles/list-roles.use-case';
import { UpdateRolUseCase } from '../application/use-cases/roles/update-rol.use-case';
import { ChangeRolStatusUseCase } from '../application/use-cases/roles/change-rol-status.use-case';
import { RolRepository } from '../domain/repositories/rol.repository';
import { PrismaRolRepository } from '../infrastructure/repositories/prisma-rol.repository';
import { ChangeRutaStatusUseCase } from '../application/use-cases/rutas/change-ruta-status.use-case';
import { CreateRutaUseCase } from '../application/use-cases/rutas/create-ruta.use-case';
import { GetRutaByIdUseCase } from '../application/use-cases/rutas/get-ruta-by-id.use-case';
import { GetRutasTreeUseCase } from '../application/use-cases/rutas/get-rutas-tree.use-case';
import { ListRutasUseCase } from '../application/use-cases/rutas/list-rutas.use-case';
import { MoveRutaUseCase } from '../application/use-cases/rutas/move-ruta.use-case';
import { UpdateRutaUseCase } from '../application/use-cases/rutas/update-ruta.use-case';
import { RutaRepository } from '../domain/repositories/ruta.repository';
import { PrismaRutaRepository } from '../infrastructure/repositories/prisma-ruta.repository';
import { GrantRouteToRoleUseCase } from '../application/use-cases/accesos/grant-route-to-role.use-case';
import { ListRoleAccessesUseCase } from '../application/use-cases/accesos/list-role-accesses.use-case';
import { ListRouteAccessesUseCase } from '../application/use-cases/accesos/list-route-accesses.use-case';
import { RevokeRouteFromRoleUseCase } from '../application/use-cases/accesos/revoke-route-from-role.use-case';
import { AccesoRepository } from '../domain/repositories/acceso.repository';
import { PrismaAccesoRepository } from '../infrastructure/repositories/prisma-acceso.repository';
import { AccesosController } from './controllers/accesos.controller';
import { ChangePersonaStatusUseCase } from '../application/use-cases/personas/change-persona-status.use-case';
import { CreatePersonaUseCase } from '../application/use-cases/personas/create-persona.use-case';
import { GetPersonaByIdUseCase } from '../application/use-cases/personas/get-persona-by-id.use-case';
import { ListPersonasUseCase } from '../application/use-cases/personas/list-personas.use-case';
import { UpdatePersonaUseCase } from '../application/use-cases/personas/update-persona.use-case';
import { PersonaRepository } from '../domain/repositories/persona.repository';
import { PrismaPersonaRepository } from '../infrastructure/repositories/prisma-persona.repository';
import { PersonasController } from './controllers/personas.controller';
import { ChangeEmpresaStatusUseCase } from '../application/use-cases/empresas/change-empresa-status.use-case';
import { CreateEmpresaUseCase } from '../application/use-cases/empresas/create-empresa.use-case';
import { GetEmpresaByIdUseCase } from '../application/use-cases/empresas/get-empresa-by-id.use-case';
import { ListEmpresasUseCase } from '../application/use-cases/empresas/list-empresas.use-case';
import { UpdateEmpresaUseCase } from '../application/use-cases/empresas/update-empresa.use-case';
import { EmpresaRepository } from '../domain/repositories/empresa.repository';
import { PrismaEmpresaRepository } from '../infrastructure/repositories/prisma-empresa.repository';
import { EmpresasController } from './controllers/empresas.controller';
import {
  ChangeEmpleadoStatusUseCase,
  CreateEmpleadoUseCase,
  GetEmpleadoByIdUseCase,
  ListEmpleadosUseCase,
  UpdateEmpleadoUseCase,
} from '../application/use-cases/empleados/empleados.use-cases';
import { EmpleadoRepository } from '../domain/repositories/empleado.repository';
import { PrismaEmpleadoRepository } from '../infrastructure/repositories/prisma-empleado.repository';
import { EmpleadosController } from './controllers/empleados.controller';
import { RolesController } from './controllers/roles.controller';
import { RutasController } from './controllers/rutas.controller';
import { PersonsDomainExceptionFilter } from './filters/persons-domain-exception.filter';
import {
  ChangeClienteStatusUseCase,
  GetClienteByIdUseCase,
  ListClientesUseCase,
  UpdateClienteUseCase,
} from '../application/use-cases/clientes/clientes.use-cases';
import { ClienteRepository } from '../domain/repositories/cliente.repository';
import { PrismaClienteRepository } from '../infrastructure/repositories/prisma-cliente.repository';
import { UserRepository } from '../domain/repositories/user.repository';
import { PrismaUserRepository } from '../infrastructure/repositories/prisma-user.repository';
import { UsuarioRolRepository } from '../domain/repositories/usuario-rol.repository';
import { PrismaUsuarioRolRepository } from '../infrastructure/repositories/prisma-usuario-rol.repository';

@Module({
  controllers: [
    RolesController,
    RutasController,
    AccesosController,
    PersonasController,
    EmpresasController,
    EmpleadosController,
  ],
  providers: [
    CreateRolUseCase,
    GetRolByIdUseCase,
    ListRolesUseCase,
    UpdateRolUseCase,
    ChangeRolStatusUseCase,
    {
      provide: RolRepository,
      useClass: PrismaRolRepository,
    },
    CreateRutaUseCase,
    GetRutaByIdUseCase,
    ListRutasUseCase,
    GetRutasTreeUseCase,
    UpdateRutaUseCase,
    MoveRutaUseCase,
    ChangeRutaStatusUseCase,
    {
      provide: RutaRepository,
      useClass: PrismaRutaRepository,
    },
    GrantRouteToRoleUseCase,
    RevokeRouteFromRoleUseCase,
    ListRoleAccessesUseCase,
    ListRouteAccessesUseCase,
    {
      provide: AccesoRepository,
      useClass: PrismaAccesoRepository,
    },
    CreatePersonaUseCase,
    GetPersonaByIdUseCase,
    ListPersonasUseCase,
    UpdatePersonaUseCase,
    ChangePersonaStatusUseCase,
    {
      provide: PersonaRepository,
      useClass: PrismaPersonaRepository,
    },
    CreateEmpresaUseCase,
    GetEmpresaByIdUseCase,
    ListEmpresasUseCase,
    UpdateEmpresaUseCase,
    ChangeEmpresaStatusUseCase,
    {
      provide: EmpresaRepository,
      useClass: PrismaEmpresaRepository,
    },
    CreateEmpleadoUseCase,
    GetEmpleadoByIdUseCase,
    ListEmpleadosUseCase,
    UpdateEmpleadoUseCase,
    ChangeEmpleadoStatusUseCase,
    { provide: EmpleadoRepository, useClass: PrismaEmpleadoRepository },
    GetClienteByIdUseCase,
    ListClientesUseCase,
    UpdateClienteUseCase,
    ChangeClienteStatusUseCase,
    { provide: ClienteRepository, useClass: PrismaClienteRepository },
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: UsuarioRolRepository, useClass: PrismaUsuarioRolRepository },
    {
      provide: APP_FILTER,
      useClass: PersonsDomainExceptionFilter,
    },
  ],
  exports: [
    PersonaRepository,
    ClienteRepository,
    EmpleadoRepository,
    RolRepository,
    UserRepository,
    UsuarioRolRepository,
  ],
})
export class PersonsModule {}
