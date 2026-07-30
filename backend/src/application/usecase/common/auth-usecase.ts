import { logger } from "../../../shared/logger/logger";
import bcrypt from "bcryptjs";
import { IAuthUseCases } from "../../interface/common/auth-usecase.interface";
import { IUserRepository } from "../../../domain/repository/user-repository.interface";
import { IJwtService } from "../../interface/common/jwt-service-usecase.interface";
import { IEmailService } from "../../interface/common/email-service-usecase.interface";
import { IOtpService } from "../../interface/common/otp-service-usecase.interface";
import {
  ForgotPasswordRequestDTO,
  LoginRequestDTO,
  LoginResponseDTO,
  RefreshTokenRequestDTO,
  RefreshTokenResponseDTO,
  ResendOtpRequestDTO,
  ResetPasswordRequestDTO,
  SendOtpRequestDTO,
  ValidateOtpRequestDTO,
  VerifyEmailRequestDTO,
} from "../../dtos/user-usecase/auth.dto";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../../shared/error/app-error";
import { OtpPurpose } from "../../../shared/enums/OtpPurpose.enum";
import { SubscriptionUseCases } from "../subscription/subscription-usecase";

const SALT_ROUNDS = 12;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class AuthUseCases implements IAuthUseCases {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: IJwtService,
    private readonly emailService: IEmailService,
    private readonly otpService: IOtpService,
    private readonly subscriptionUseCase: SubscriptionUseCases,
  ) {}

  async login(data: LoginRequestDTO): Promise<LoginResponseDTO> {
    const user = await this.userRepository.findByEmail(data.email);

    if (!user) {
      throw new UnauthorizedError(
        "Invalid email or password.",
        "Please check your credentials and try again.",
      );
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError(
        "Invalid email or password.",
        "Please check your credentials and try again.",
      );
    }

    if (user.status === "pending_verification") {
      throw new ForbiddenError(
        "Email not verified.",
        "Please verify your email before logging in. Check your inbox for the OTP.",
      );
    }
    if (user.status === "inactive" || user.status === "suspended") {
      throw new ForbiddenError(
        `Account is ${user.status}.`,
        "Please contact support for assistance.",
      );
    }

    const payload = { userId: user._id!, email: user.email, role: user.role };
    const accessToken = this.jwtService.generateAccessToken(payload);
    const refreshToken = this.jwtService.generateRefreshToken(payload);

    const hashedRefresh = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await this.userRepository.updateRefreshToken(user._id!, hashedRefresh);
    await this.userRepository.updateLastLogin(user._id!);

    if (user.role === "admin" || user.role === "manager") {
      this.subscriptionUseCase
        .renewExpiredPeriodIfNeeded(user._id!)
        .catch((err) => logger.error(String(err)));
    }

    return {
      accessToken,
      refreshToken,
      user: {
        _id: user._id!,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
        building_id: user.building_id ?? null,
        lastLoginAt: new Date(),
      },
    };
  }

  async logout(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(
        "User not found.",
        "The user account associated with this session no longer exists.",
      );
    }
    await this.userRepository.updateRefreshToken(userId, null);
  }

  async refreshToken(
    data: RefreshTokenRequestDTO,
  ): Promise<RefreshTokenResponseDTO> {
    let payload;
    try {
      payload = this.jwtService.verifyRefreshToken(data.refreshToken);
    } catch {
      throw new UnauthorizedError(
        "Invalid or expired refresh token.",
        "Your session has expired. Please login again.",
      );
    }

    const user = await this.userRepository.findById(payload.userId);

    if (!user || !user.refresh_token) {
      throw new UnauthorizedError(
        "Session not found.",
        "Your session has expired. Please login again.",
      );
    }

    const isTokenValid = await bcrypt.compare(
      data.refreshToken,
      user.refresh_token,
    );
    if (!isTokenValid) {
      await this.userRepository.updateRefreshToken(payload.userId, null);
      throw new UnauthorizedError(
        "Refresh token reuse detected. All sessions have been invalidated.",
        "Please login again for security reasons.",
      );
    }

    const newPayload = {
      userId: user._id!,
      email: user.email,
      role: user.role,
    };
    const newAccessToken = this.jwtService.generateAccessToken(newPayload);
    const newRefreshToken = this.jwtService.generateRefreshToken(newPayload);

    const hashedRefresh = await bcrypt.hash(newRefreshToken, SALT_ROUNDS);
    await this.userRepository.updateRefreshToken(user._id!, hashedRefresh);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async sendOtp(data: SendOtpRequestDTO): Promise<void> {
    const user = await this.userRepository.findByEmail(data.email);

    if (!user) {
      throw new NotFoundError(
        "No account found with this email address.",
        "Please check the email entered or contact support.",
      );
    }

    if (data.purpose === OtpPurpose.EMAIL_VERIFICATION && user.email_verified) {
      throw new BadRequestError(
        "Email is already verified.",
        "You can proceed to login.",
      );
    }

    const otp = generateOtp();
    await this.otpService.saveOtp(data.email, data.purpose, otp);
    await this.emailService.sendOtpEmail(data.email, otp, data.purpose);
  }

  async resendOtp(data: ResendOtpRequestDTO): Promise<void> {
    await this.sendOtp({ email: data.email, purpose: data.purpose });
  }

  async validateOtp(
    data: ValidateOtpRequestDTO,
  ): Promise<{ resetToken: string }> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new NotFoundError(
        "No account found with this email address.",
        "Please check the email entered or contact support.",
      );
    }

    const storedOtp = await this.otpService.getOtp(
      data.email,
      OtpPurpose.FORGOT_PASSWORD,
    );

    if (!storedOtp) {
      throw new BadRequestError(
        "No OTP was requested or it has expired.",
        "Please request a new OTP and try again.",
      );
    }

    if (storedOtp !== data.otp) {
      throw new BadRequestError(
        "Invalid OTP.",
        "Please check the OTP sent to your email and try again.",
      );
    }

    await this.otpService.clearOtp(data.email, OtpPurpose.FORGOT_PASSWORD);

    const resetToken = this.jwtService.generateAccessToken({
      userId: user._id!,
      email: user.email,
      role: "" as any,
    });

    return { resetToken };
  }

  async verifyEmail(data: VerifyEmailRequestDTO): Promise<void> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new NotFoundError(
        "No account found with this email address.",
        "Please check the email entered or contact support.",
      );
    }

    if (user.email_verified) {
      throw new BadRequestError(
        "Email is already verified.",
        "You can proceed to login.",
      );
    }

    const storedOtp = await this.otpService.getOtp(
      data.email,
      OtpPurpose.EMAIL_VERIFICATION,
    );

    if (!storedOtp) {
      throw new BadRequestError(
        "No OTP was requested or it has expired.",
        "Please request a new OTP and try again.",
      );
    }

    if (storedOtp !== data.otp) {
      throw new BadRequestError(
        "Invalid OTP.",
        "Please check the OTP sent to your email and try again.",
      );
    }

    await this.otpService.clearOtp(data.email, OtpPurpose.EMAIL_VERIFICATION);
    await this.userRepository.updateEmailVerified(user._id!);
  }

  async forgotPassword(data: ForgotPasswordRequestDTO): Promise<void> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) return;

    const otp = generateOtp();
    await this.otpService.saveOtp(data.email, OtpPurpose.FORGOT_PASSWORD, otp);
    await this.emailService.sendOtpEmail(
      data.email,
      otp,
      OtpPurpose.FORGOT_PASSWORD,
    );
  }

  async resetPassword(data: ResetPasswordRequestDTO): Promise<void> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new NotFoundError(
        "No account found with this email address.",
        "Please check the email entered or contact support.",
      );
    }

    const storedOtp = await this.otpService.getOtp(
      data.email,
      OtpPurpose.FORGOT_PASSWORD,
    );

    if (!storedOtp) {
      throw new BadRequestError(
        "No OTP was requested or it has expired.",
        "Please use the forgot-password flow to request a valid OTP.",
      );
    }

    if (storedOtp !== data.otp) {
      throw new BadRequestError(
        "Invalid OTP.",
        "Please check the OTP sent to your email and try again.",
      );
    }

    await this.otpService.clearOtp(data.email, OtpPurpose.FORGOT_PASSWORD);

    const hashedPassword = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
    await this.userRepository.updatePassword(data.email, hashedPassword);
    await this.userRepository.updateRefreshToken(user._id!, null);
  }
}
