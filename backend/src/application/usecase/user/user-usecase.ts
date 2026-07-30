import { IUser } from "../../../domain/entities/User";
import { IUserRepository } from "../../../domain/repository/user-repository.interface";
import { AppError } from "../../../shared/error/app-error";
import { IUserUseCase } from "../../interface/user/user-usecase.interface";

function sanitize(user: IUser): IUser {
  const { password, refresh_token, ...rest } = user;
  return rest as IUser;
}

export class UserUseCase implements IUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async getProfile(userId: string): Promise<IUser | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "Make sure the user ID is correct",
      );
    }
    return sanitize(user);
  }

  async updateProfile(
    userId: string,
    data: Partial<IUser>,
  ): Promise<IUser | null> {
    // You might want to strip sensitive fields here like password, role, email_verified, etc.
    const allowedUpdates: Partial<IUser> = { ...data };
    delete allowedUpdates.password;
    delete allowedUpdates.role;
    delete allowedUpdates.email_verified;
    delete allowedUpdates.phone_verified;
    delete allowedUpdates.status;

    const updatedUser = await this.userRepository.update(
      userId,
      allowedUpdates,
    );
    if (!updatedUser) {
      throw new AppError(
        "User not found",
        404,
        "Make sure the user ID is correct",
      );
    }
    return sanitize(updatedUser);
  }

  async createManager(adminId: string, data: any): Promise<IUser> {
    const admin = await this.userRepository.findById(adminId);
    if (!admin || (admin.role !== "admin" && admin.role !== "super_admin")) {
      throw new AppError(
        "Unauthorized",
        403,
        "Only admins explicitly can create managers",
      );
    }

    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError(
        "Email already in use",
        400,
        "A user with this email already exists.",
      );
    }

    // Hash the generic password so managers can immediately login via email/password natively
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const newUser = await this.userRepository.create({
      ...data,
      password: hashedPassword,
      role: "manager",
      status: "active",
      email_verified: true,
      phone_verified: false,
      ownerId: adminId,
    } as any);

    return sanitize(newUser);
  }

  async getMyManagers(adminId: string): Promise<IUser[]> {
    const managers = await this.userRepository.findByOwnerId(adminId);
    return managers.map(sanitize);
  }

  async updateManagerStatus(
    adminId: string,
    managerId: string,
    status: "active" | "inactive" | "suspended",
  ): Promise<IUser> {
    const manager = await this.userRepository.findById(managerId);
    if (!manager || manager.ownerId !== adminId) {
      throw new AppError(
        "Manager not found",
        404,
        "This manager does not belong to your account.",
      );
    }
    await this.userRepository.updateStatus(managerId, status);
    const updated = await this.userRepository.findById(managerId);
    return sanitize(updated!);
  }

  async deleteManager(adminId: string, managerId: string): Promise<void> {
    const manager = await this.userRepository.findById(managerId);
    if (!manager || manager.ownerId !== adminId) {
      throw new AppError(
        "Manager not found",
        404,
        "This manager does not belong to your account.",
      );
    }
    await this.userRepository.delete(managerId);
  }
}
