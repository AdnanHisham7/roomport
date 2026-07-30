import { env } from "../config/env";
import { logger } from "../../shared/logger/logger";
import { Redis } from "ioredis";
import { IOtpService } from "../../application/interface/common/otp-service-usecase.interface";

const OTP_TTL_SECONDS = parseInt(process.env.OTP_TTL_SECONDS || "600", 10);

export class RedisOtpService implements IOtpService {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || "0", 10),
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });

    this.client.on("connect", () => logger.info("✅  Redis connected"));
    this.client.on("error", (err: Error) =>
      logger.error("❌  Redis error:", err.message),
    );
  }

  private key(email: string, purpose: string): string {
    return `otp:${email.toLowerCase()}:${purpose}`;
  }

  async saveOtp(email: string, purpose: string, otp: string): Promise<void> {
    await this.client.set(this.key(email, purpose), otp, "EX", OTP_TTL_SECONDS);
  }

  async getOtp(email: string, purpose: string): Promise<string | null> {
    return this.client.get(this.key(email, purpose));
  }

  async clearOtp(email: string, purpose: string): Promise<void> {
    await this.client.del(this.key(email, purpose));
  }
}
