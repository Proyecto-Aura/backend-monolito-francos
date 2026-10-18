import { Injectable } from '@nestjs/common';
import { S3Service } from '../../../../infrastructure/storage/s3.service';
import { EvidenciaReembolsoService } from '../../domain/services/evidencia-reembolso.service';

// La evidencia es un documento privado del cliente: va en el bucket de
// documentos y solo se comparte con un enlace firmado que vence a los 5 minutos.
@Injectable()
export class S3EvidenciaReembolsoService implements EvidenciaReembolsoService {
  constructor(private readonly s3: S3Service) {}

  urlDescarga(key: string): Promise<string> {
    return this.s3.getPresignedUrl('docs', key);
  }
}
