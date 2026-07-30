import type { UserRole } from "../../../domain/entities/User";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface IJwtService {
  generateAccessToken(payload: TokenPayload): string;
  generateRefreshToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): TokenPayload;
  verifyRefreshToken(token: string): TokenPayload;
}
