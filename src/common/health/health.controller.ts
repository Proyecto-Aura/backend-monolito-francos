import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { Public } from '../../modules/auth/presentation/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('live')
  @ApiOperation({
    summary:
      'Verificar que el proceso de la API esté vivo, sin consultar la base de datos',
  })
  @ApiOkResponse({
    description: 'El proceso de la API está vivo',
    schema: { example: { status: 'ok' } },
  })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Verificar disponibilidad de la API y la base de datos',
  })
  @ApiOkResponse({
    description: 'La API y la base de datos están disponibles',
    schema: { example: { status: 'ok' } },
  })
  @ApiServiceUnavailableResponse({
    description: 'La base de datos no está disponible',
  })
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException();
    }

    return { status: 'ok' };
  }
}
