import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GrantRouteToRoleUseCase } from '../../application/use-cases/accesos/grant-route-to-role.use-case';
import { ListRoleAccessesUseCase } from '../../application/use-cases/accesos/list-role-accesses.use-case';
import { ListRouteAccessesUseCase } from '../../application/use-cases/accesos/list-route-accesses.use-case';
import { RevokeRouteFromRoleUseCase } from '../../application/use-cases/accesos/revoke-route-from-role.use-case';
import { AccesoPresenter } from '../presenters/acceso.presenter';

@ApiTags('Accesos')
@Controller()
export class AccesosController {
  constructor(
    private readonly grantRouteToRole: GrantRouteToRoleUseCase,
    private readonly revokeRouteFromRole: RevokeRouteFromRoleUseCase,
    private readonly listRoleAccesses: ListRoleAccessesUseCase,
    private readonly listRouteAccesses: ListRouteAccessesUseCase,
  ) {}

  @Post('roles/:rolId/rutas/:rutaId')
  @ApiOperation({ summary: 'Conceder una ruta a un rol' })
  @ApiParam({ name: 'rolId', type: Number })
  @ApiParam({ name: 'rutaId', type: Number })
  async grant(
    @Param('rolId', ParseIntPipe) rolId: number,
    @Param('rutaId', ParseIntPipe) rutaId: number,
  ) {
    return AccesoPresenter.toHttp(
      await this.grantRouteToRole.execute(rolId, rutaId),
    );
  }

  @Delete('roles/:rolId/rutas/:rutaId')
  @ApiOperation({ summary: 'Retirar una ruta de un rol' })
  @ApiParam({ name: 'rolId', type: Number })
  @ApiParam({ name: 'rutaId', type: Number })
  async revoke(
    @Param('rolId', ParseIntPipe) rolId: number,
    @Param('rutaId', ParseIntPipe) rutaId: number,
  ) {
    return AccesoPresenter.toHttp(
      await this.revokeRouteFromRole.execute(rolId, rutaId),
    );
  }

  @Get('roles/:rolId/rutas')
  @ApiOperation({ summary: 'Listar los accesos de un rol' })
  @ApiParam({ name: 'rolId', type: Number })
  async byRole(@Param('rolId', ParseIntPipe) rolId: number) {
    const accesos = await this.listRoleAccesses.execute(rolId);
    return accesos.map((acceso) => AccesoPresenter.toHttp(acceso));
  }

  @Get('rutas/:rutaId/roles')
  @ApiOperation({ summary: 'Listar los roles con acceso a una ruta' })
  @ApiParam({ name: 'rutaId', type: Number })
  async byRoute(@Param('rutaId', ParseIntPipe) rutaId: number) {
    const accesos = await this.listRouteAccesses.execute(rutaId);
    return accesos.map((acceso) => AccesoPresenter.toHttp(acceso));
  }
}
