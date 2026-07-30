import type { IUser } from "../entities/User";

export interface UserListFilter {
  role?: IUser["role"];
  status?: IUser["status"];
  search?: string; // matches email / first_name / last_name
  ownerId?: string; // managers belonging to a specific admin
}

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>;
  findAll(): Promise<IUser[]>;
  findAllPaginated(
    filter: UserListFilter,
    skip: number,
    limit: number,
  ): Promise<{ data: IUser[]; total: number }>;
  countAll(filter?: UserListFilter): Promise<number>;
  findByOwnerId(ownerId: string): Promise<IUser[]>;
  create(data: Omit<IUser, "_id" | "createdAt" | "updatedAt">): Promise<IUser>;
  updateStatus(userId: string, status: IUser["status"]): Promise<void>;
  updateEmailVerified(userId: string): Promise<void>;
  updatePassword(email: string, hashedPassword: string): Promise<void>;
  updateRefreshToken(userId: string, hashedToken: string | null): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
  update(userId: string, data: Partial<IUser>): Promise<IUser | null>;
  delete(userId: string): Promise<boolean>;
}
