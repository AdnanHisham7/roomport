import { logger } from "../../../shared/logger/logger";
import bcrypt from "bcryptjs";
import { IRegisterUseCase } from "../../interface/common/register-usecase.interface";
import { IUserRepository } from "../../../domain/repository/user-repository.interface";
import { IEmailService } from "../../interface/common/email-service-usecase.interface";
import { IOtpService } from "../../interface/common/otp-service-usecase.interface";
import {
  RegisterRequestDTO,
  RegisterResponseDTO,
} from "../../dtos/user-usecase/register.dto";
import { BadRequestError } from "../../../shared/error/app-error";
import { OtpPurpose } from "../../../shared/enums/OtpPurpose.enum";

const SALT_ROUNDS = 12;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class RegisterUseCase implements IRegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailService: IEmailService,
    private readonly otpService: IOtpService,
  ) {}

  async register(data: RegisterRequestDTO): Promise<RegisterResponseDTO> {
    // 1. Check email uniqueness
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new BadRequestError(
        "An account with this email already exists.",
        "Please use a different email or login to your existing account.",
      );
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // 3. Create user
    //    - role = 'admin'  (every public registrant is a building owner)
    //    - status = 'pending_verification' (must verify email before login)
    const user = await this.userRepository.create({
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone_number: data.phone_number,
      role: "admin",
      status: "pending_verification",
      email_verified: false,
      phone_verified: false,
      paymentStatus: false,
      refresh_token: null,
    });

    // 4. Generate OTP and save to Redis, then send email (non-blocking)
    const otp = generateOtp();
    await this.otpService.saveOtp(
      user.email,
      OtpPurpose.EMAIL_VERIFICATION,
      otp,
    );
    this.emailService
      .sendOtpEmail(user.email, otp, OtpPurpose.EMAIL_VERIFICATION)
      .catch((err) => logger.error("[EmailService] OTP send failed:", err));

    return {
      message:
        "Account created. Please check your email for the OTP to verify your account.",
      user: {
        _id: user._id!,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    };
  }
}
