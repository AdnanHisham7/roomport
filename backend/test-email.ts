import dotenv from "dotenv";
dotenv.config();
import { EmailService } from "./src/infrastructure/services/email-service";

const to = process.argv[2] || process.env.TEST_EMAIL;

async function run() {
  if (!to) {
    console.error(
      "❌ Please specify a recipient email address: npx ts-node test-email.ts <your-email@example.com>",
    );
    process.exit(1);
  }

  console.log(`Sending test verification email to: ${to}...`);
  const emailService = new EmailService();

  try {
    await emailService.sendOtpEmail(to, "849201", "EMAIL_VERIFICATION");
    console.log(`✅ Verification email sent successfully to ${to}!`);
    console.log("Check your inbox / spam folder or Resend dashboard.");
  } catch (error: any) {
    console.error("❌ Email verification test failed:", error.message || error);
    process.exit(1);
  }
}

run();
