export type UserRole = "super_admin" | "admin" | "manager";
export type UserStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "pending_verification";

export interface IUser {
  _id?: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  password: string;
  status: UserStatus;
  role: UserRole;
  building_id?: string;
  ownerId?: string; // for role='manager' — the admin (builder) who created/owns this account
  profile_image?: string;
  lastLoginAt?: Date;
  refresh_token?: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  paymentStatus: boolean;
  subscriptionId?: string;
  payoutQrCodeUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
