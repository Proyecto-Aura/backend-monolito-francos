import { Module } from '@nestjs/common';
import { EmailService } from '../domain/services/email.service';
import { NodemailerEmailService } from '../infrastructure/services/nodemailer-email.service';

// Provee el envío de correos a auth y a persons sin crear un ciclo.
@Module({
  providers: [{ provide: EmailService, useClass: NodemailerEmailService }],
  exports: [EmailService],
})
export class EmailModule {}
