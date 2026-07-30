export interface IRedisService {
  setOtp(email: string, purpose: string, otp: string): Promise<void>;
  getOtp(email: string, purpose: string): Promise<string | null>;
  deleteOtp(email: string, purpose: string): Promise<void>;
}
