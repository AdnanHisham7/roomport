import { OtpPurpose } from "../../../shared/enums/OtpPurpose.enum";
export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
  user: {
    _id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    status: string;
    email_verified: boolean;
    building_id?: string | null;
    lastLoginAt?: Date;
  };
}
export interface RefreshTokenRequestDTO {
  refreshToken: string;
}
export interface RefreshTokenResponseDTO {
  accessToken: string;
  refreshToken: string;
}
export interface SendOtpRequestDTO {
  email: string;
  purpose: OtpPurpose;
}
export interface ValidateOtpRequestDTO {
  email: string;
  otp: string;
}
export interface ResendOtpRequestDTO {
  email: string;
  purpose: OtpPurpose;
}
export interface VerifyEmailRequestDTO {
  email: string;
  otp: string;
}
export interface ForgotPasswordRequestDTO {
  email: string;
}
export interface ResetPasswordRequestDTO {
  email: string;
  otp: string;
  newPassword: string;
}
