import {
  SendVerificationEmailParams,
  SendDefaultCredentialsEmailParams,
} from './types/email-service.types';

export abstract class EmailService {
  abstract sendVerificationEmail(
    params: SendVerificationEmailParams,
  ): Promise<void>;
  abstract sendDefaultCredentialsEmail(
    params: SendDefaultCredentialsEmailParams,
  ): Promise<void>;
}
