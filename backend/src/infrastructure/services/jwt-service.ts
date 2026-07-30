import { env } from "../config/env";
import jwt from "jsonwebtoken";
import type {
  IJwtService,
  TokenPayload,
} from "../../application/interface/common/jwt-service-usecase.interface";
import { UnauthorizedError } from "../../shared/error/app-error";

export class JwtService implements IJwtService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;

  constructor() {
    this.accessSecret = env.JWT_ACCESS_SECRET || "access_secret_changeme";
    this.refreshSecret = env.JWT_REFRESH_SECRET || "refresh_secret_changeme";
    this.accessExpiry =
      env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRY || "15m";
    this.refreshExpiry =
      env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRY || "7d";
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessExpiry,
    } as jwt.SignOptions);
  }

  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiry,
    } as jwt.SignOptions);
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.accessSecret) as TokenPayload;
    } catch {
      throw new UnauthorizedError(
        "Access token is invalid or expired.",
        "Please login again or use your refresh token to obtain a new access token.",
      );
    }
  }

  verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.refreshSecret) as TokenPayload;
    } catch {
      throw new UnauthorizedError(
        "Refresh token is invalid or expired.",
        "Your session has expired. Please login again.",
      );
    }
  }
}
