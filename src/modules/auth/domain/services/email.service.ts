import {
  SendVerificationEmailParams,
  SendDefaultCredentialsEmailParams,
  SendPasswordResetEmailParams,
  SendClienteBienvenidaEmailParams,
  SendEmailChangeVerificationEmailParams,
} from './types/email-service.types';

export abstract class EmailService {
  abstract sendVerificationEmail(
    params: SendVerificationEmailParams,
  ): Promise<void>;
  abstract sendDefaultCredentialsEmail(
    params: SendDefaultCredentialsEmailParams,
  ): Promise<void>;
  abstract sendClienteBienvenidaEmail(
    params: SendClienteBienvenidaEmailParams,
  ): Promise<void>;
  abstract sendPasswordResetEmail(
    params: SendPasswordResetEmailParams,
  ): Promise<void>;
  abstract sendEmailChangeVerificationEmail(
    params: SendEmailChangeVerificationEmailParams,
  ): Promise<void>;
}
