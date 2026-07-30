import { IUser } from "../../../domain/entities/User";

export interface IUserUseCase {
  getProfile(userId: string): Promise<IUser | null>;
  updateProfile(userId: string, data: Partial<IUser>): Promise<IUser | null>;
  createManager(adminId: string, data: any): Promise<IUser>;
  getMyManagers(adminId: string): Promise<IUser[]>;
  updateManagerStatus(
    adminId: string,
    managerId: string,
    status: "active" | "inactive" | "suspended",
  ): Promise<IUser>;
  deleteManager(adminId: string, managerId: string): Promise<void>;
}
