import { Injectable } from '@nestjs/common';
import {
  UbigeoItem,
  UbigeoRepository,
} from '../../../domain/repositories/ubigeo.repository';

@Injectable()
export class ListDepartamentosUseCase {
  constructor(private readonly ubigeoRepository: UbigeoRepository) {}

  execute(): Promise<UbigeoItem[]> {
    return this.ubigeoRepository.listDepartamentos();
  }
}

@Injectable()
export class ListProvinciasUseCase {
  constructor(private readonly ubigeoRepository: UbigeoRepository) {}

  execute(departamentoId: string): Promise<UbigeoItem[]> {
    return this.ubigeoRepository.listProvincias(departamentoId);
  }
}

@Injectable()
export class ListDistritosUseCase {
  constructor(private readonly ubigeoRepository: UbigeoRepository) {}

  execute(provinciaId: string): Promise<UbigeoItem[]> {
    return this.ubigeoRepository.listDistritos(provinciaId);
  }
}
