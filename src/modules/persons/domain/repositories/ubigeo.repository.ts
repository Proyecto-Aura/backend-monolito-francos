export interface UbigeoItem {
  id: string;
  nombre: string;
}

// Catálogo de ubicación (solo lectura): departamento → provincia → distrito.
export abstract class UbigeoRepository {
  abstract listDepartamentos(): Promise<UbigeoItem[]>;
  abstract listProvincias(departamentoId: string): Promise<UbigeoItem[]>;
  abstract listDistritos(provinciaId: string): Promise<UbigeoItem[]>;
  abstract existsDistrito(id: string): Promise<boolean>;
}
