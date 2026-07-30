export interface IOtpService {
  // Store OTP in Redis with TTL
  saveOtp(email: string, purpose: string, otp: string): Promise<void>;

  // Retrieve OTP from Redis — returns null if expired or not found
  getOtp(email: string, purpose: string): Promise<string | null>;

  // Delete OTP after use
  clearOtp(email: string, purpose: string): Promise<void>;
}
