import bcrypt from "bcryptjs";
import { IBootstrapUseCase } from "../../interface/common/bootstrap-usecase.interface";
import { IUserRepository } from "../../../domain/repository/user-repository.interface";
import {
  BootstrapRequestDTO,
  BootstrapResponseDTO,
} from "../../dtos/bootstrap/bootstrap.dto";
import { BadRequestError } from "../../../shared/error/app-error";

const SALT_ROUNDS = 12;

export class BootstrapSuperAdminUseCase implements IBootstrapUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async bootstrap(data: BootstrapRequestDTO): Promise<BootstrapResponseDTO> {
    // Guard: only run if no users exist yet
    const allUsers = await this.userRepository.findAll();
    if (allUsers.length > 0) {
      throw new BadRequestError(
        "System is already bootstrapped. A super admin already exists.",
        "This endpoint can only be used once during initial setup.",
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const superAdmin = await this.userRepository.create({
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone_number: data.phone_number,
      role: "super_admin", // ← inline string, no Role collection needed
      status: "active", // pre-verified
      email_verified: true,
      phone_verified: false,
      paymentStatus: false,
      refresh_token: null,
    });

    return {
      message: "System bootstrapped successfully. Super Admin account created.",
      superAdmin: {
        _id: superAdmin._id!,
        email: superAdmin.email,
        first_name: superAdmin.first_name,
        last_name: superAdmin.last_name,
        role: superAdmin.role,
      },
    };
  }
}
