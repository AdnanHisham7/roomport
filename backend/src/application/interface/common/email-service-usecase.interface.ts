export interface ISendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface IEmailService {
  sendOtpEmail(to: string, otp: string, purpose: string): Promise<void>;
  sendWelcomeCredentials(
    to: string,
    name: string,
    tempPassword: string,
  ): Promise<void>;
  sendBuilderWelcomeCredentials?(
    to: string,
    name: string,
    tempPassword: string,
  ): Promise<void>;
  sendNotificationEmail?(
    to: string,
    subject: string,
    message: string,
  ): Promise<void>;
  send?(opts: ISendMailOptions): Promise<void>;
}
