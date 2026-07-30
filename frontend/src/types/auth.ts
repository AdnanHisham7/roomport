export type UserRole = 'super_admin' | 'admin' | 'manager';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

export interface AuthUser {
  _id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  building_id?: string | null;
  lastLoginAt?: string;
}

export interface FullProfile extends AuthUser {
  phone_number?: string;
  profile_image?: string;
  ownerId?: string;
  paymentStatus: boolean;
  phone_verified: boolean;
  subscriptionId?: string;
  payoutQrCodeUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
