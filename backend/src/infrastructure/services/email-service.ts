import { env } from "../config/env";
import nodemailer from "nodemailer";
import { IEmailService } from "../../application/interface/common/email-service-usecase.interface";
import { OtpPurpose } from "../../shared/enums/OtpPurpose.enum";
import { logger } from "../../shared/logger/logger";

export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT) || 587,
      secure: env.SMTP_SECURE === "true",
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      tls: {
        rejectUnauthorized: false,
      },
    });

    if (env.SMTP_USER && env.SMTP_PASS) {
      this.transporter.verify((error) => {
        if (error) {
          logger.error(
            "SMTP connection verification failed — emails will not be delivered:",
            error,
          );
        } else {
          logger.info("SMTP connection verified — email sending is ready.");
        }
      });
    } else {
      logger.error(
        "SMTP_USER / SMTP_PASS are not configured — email sending is disabled.",
      );
    }
  }

  private from(): string {
    return env.EMAIL_FROM_NAME
      ? `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM || env.SMTP_USER}>`
      : env.EMAIL_FROM || env.SMTP_USER || "";
  }

  // ── Generic OTP email (auth flows) ─────────────────────────────────────────
  async sendOtpEmail(to: string, otp: string, purpose: string): Promise<void> {
    const { subject, body } = this.buildOtpContent(otp, purpose);
    await this.transporter.sendMail({
      from: this.from(),
      to,
      subject,
      html: body,
    });
  }

  // ── Welcome Credentials ────────────────────────────────────────────────────
  async sendWelcomeCredentials(
    to: string,
    name: string,
    tempPassword: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from(),
      to,
      subject: "Welcome to PropertySaaS! Here are your login credentials",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#333">Welcome to PropertySaaS, ${name}!</h2>
          <p>Your payment was successful and your account has been automatically created.</p>
          <p>You can now log in using the following credentials:</p>
          <div style="background:#f4f4f4;padding:15px;border-radius:6px;margin:20px 0">
            <p><strong>Email:</strong> ${to}</p>
            <p><strong>Password:</strong> ${tempPassword}</p>
          </div>
          <p>We strongly recommend changing your password after your first login.</p>
        </div>
      `,
    });
  }

  // ── Builder Welcome Credentials (manual admin registration) ────────────────
  async sendBuilderWelcomeCredentials(
    to: string,
    name: string,
    tempPassword: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from(),
      to,
      subject: "Welcome to PropertySaaS! Here are your login credentials",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#333">Welcome to PropertySaaS, ${name}!</h2>
          <p>An account has been created for you by our team.</p>
          <p>You can now log in using the following credentials:</p>
          <div style="background:#f4f4f4;padding:15px;border-radius:6px;margin:20px 0">
            <p><strong>Email:</strong> ${to}</p>
            <p><strong>Password:</strong> ${tempPassword}</p>
          </div>
          <p>We strongly recommend changing your password after your first login.</p>
        </div>
      `,
    });
  }

  // ── Step 2: Admin sends signing link to tenant ─────────────────────────────
  async sendSigningLink(
    to: string,
    tenantName: string,
    signingUrl: string,
    agreementTitle: string,
    expiresInHours: number,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from(),
      to,
      subject: `Action Required: Sign Your Rental Agreement — ${agreementTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#333">Rental Agreement Ready to Sign</h2>
          <p>Hi <strong>${tenantName}</strong>,</p>
          <p>Your rental agreement <strong>"${agreementTitle}"</strong> is ready for your digital signature.</p>
          <p>Click the button below to review and sign. This link expires in <strong>${expiresInHours} hours</strong>.</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${signingUrl}"
               style="background:#4F46E5;color:#fff;padding:14px 28px;border-radius:6px;
                      text-decoration:none;font-weight:bold;display:inline-block">
              Review &amp; Sign Agreement
            </a>
          </div>
          <p style="color:#888;font-size:12px">
            If you did not expect this email, please contact your property manager immediately.<br/>
            Do not share this link with anyone.
          </p>
        </div>
      `,
    });
  }

  // ── Step 5: OTP for agreement signing ──────────────────────────────────────
  async sendAgreementOtp(
    to: string,
    tenantName: string,
    otp: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from(),
      to,
      subject: "Your Rental Agreement Signing OTP",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#333">Confirm Your Digital Signature</h2>
          <p>Hi <strong>${tenantName}</strong>,</p>
          <p>You are about to digitally sign your rental agreement. Enter this OTP to confirm:</p>
          <div style="text-align:center;margin:30px 0">
            <h1 style="letter-spacing:12px;font-size:42px;color:#4F46E5;
                       border:2px dashed #4F46E5;padding:20px;border-radius:8px;
                       display:inline-block">${otp}</h1>
          </div>
          <p>This OTP is valid for <strong>10 minutes</strong>.</p>
          <p style="color:#c00;font-weight:bold">
            ⚠️ By completing this step, you legally agree to the terms of the rental agreement.
          </p>
          <p style="color:#888;font-size:12px">
            If you did not initiate this signing, contact your property manager immediately.
          </p>
        </div>
      `,
    });
  }

  // ── Step 8: Completion confirmation with PDF link ──────────────────────────
  async sendCompletionEmail(
    to: string,
    tenantName: string,
    agreementTitle: string,
    pdfUrl: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from(),
      to,
      subject: `Agreement Signed ✓ — ${agreementTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <div style="background:#f0f7f0;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px">
            <h2 style="color:#2d6a2d;margin:0">✓ Agreement Successfully Signed</h2>
          </div>
          <p>Hi <strong>${tenantName}</strong>,</p>
          <p>Your rental agreement <strong>"${agreementTitle}"</strong> has been
             digitally signed and verified.</p>
          <p>Your signed copy is ready for download:</p>
          <div style="text-align:center;margin:20px 0">
            <a href="${pdfUrl}"
               style="background:#2d6a2d;color:#fff;padding:12px 24px;border-radius:6px;
                      text-decoration:none;font-weight:bold;display:inline-block">
              Download Signed Agreement
            </a>
          </div>
          <p style="color:#888;font-size:12px">Keep this document for your records.</p>
        </div>
      `,
    });
  }

  // ── Generic Notification Email ──────────────────────────────────────────────
  async sendNotificationEmail(
    to: string,
    subject: string,
    message: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from(),
      to,
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#333">${subject}</h2>
          <p>${message}</p>
        </div>
      `,
    });
  }

  private buildOtpContent(
    otp: string,
    purpose: string,
  ): { subject: string; body: string } {
    if (purpose === OtpPurpose.FORGOT_PASSWORD) {
      return {
        subject: "Password Reset OTP",
        body: `<h2>Password Reset</h2><p>Your OTP:</p>
               <h1 style="letter-spacing:6px">${otp}</h1>
               <p>Expires in <strong>10 minutes</strong>.</p>`,
      };
    }
    return {
      subject: "Email Verification OTP",
      body: `<h2>Verify Your Email</h2><p>Your OTP:</p>
             <h1 style="letter-spacing:6px">${otp}</h1>
             <p>Expires in <strong>10 minutes</strong>.</p>`,
    };
  }
}
