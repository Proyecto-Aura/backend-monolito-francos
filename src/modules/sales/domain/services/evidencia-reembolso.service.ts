// Donde vive el archivo de evidencia que el cliente adjunta a su solicitud.
export abstract class EvidenciaReembolsoService {
  // Enlace temporal para que el operador de ventas descargue la evidencia.
  abstract urlDescarga(key: string): Promise<string>;
}
