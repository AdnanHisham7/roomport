import type { Request, Response } from "express";
import type { IAuthUseCases } from "../../application/interface/common/auth-usecase.interface";
import type { IRegisterUseCase } from "../../application/interface/common/register-usecase.interface";
import { AppError } from "../../shared/error/app-error";
import type {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  sendOtpSchema,
  validateOtpSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validator";
import type { z } from "zod";

export class AuthController {
  constructor(
    private readonly authUseCases: IAuthUseCases,
    private readonly registerUseCase: IRegisterUseCase,
  ) {}

  register = async (
    req: Request<unknown, unknown, z.infer<typeof registerSchema>>,
    res: Response,
  ): Promise<Response> => {
    try {
      const result = await this.registerUseCase.register(req.body);
      return res.status(201).json(result);
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred during registration.",
      );
    }
  };

  login = async (
    req: Request<unknown, unknown, z.infer<typeof loginSchema>>,
    res: Response,
  ): Promise<Response> => {
    try {
      const result = await this.authUseCases.login(req.body);
      return res
        .status(200)
        .json({ message: "Login successful.", data: result });
    } catch (error) {
      return this.handleError(res, error, "An error occurred during login.");
    }
  };

  logout = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          message: "Logout failed: Unauthorized.",
          suggestion: "Please login and try again.",
        });
      }
      await this.authUseCases.logout(userId);
      return res.status(200).json({ message: "Logged out successfully." });
    } catch (error) {
      return this.handleError(res, error, "An error occurred during logout.");
    }
  };

  refreshToken = async (
    req: Request<unknown, unknown, z.infer<typeof refreshTokenSchema>>,
    res: Response,
  ): Promise<Response> => {
    try {
      const result = await this.authUseCases.refreshToken(req.body);
      return res
        .status(200)
        .json({ message: "Token refreshed successfully.", data: result });
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred while refreshing the token.",
      );
    }
  };

  sendOtp = async (
    req: Request<unknown, unknown, z.infer<typeof sendOtpSchema>>,
    res: Response,
  ): Promise<Response> => {
    try {
      await this.authUseCases.sendOtp(req.body);
      return res
        .status(200)
        .json({ message: `OTP sent successfully to ${req.body.email}.` });
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred while sending the OTP.",
      );
    }
  };

  resendOtp = async (
    req: Request<unknown, unknown, z.infer<typeof sendOtpSchema>>,
    res: Response,
  ): Promise<Response> => {
    try {
      await this.authUseCases.resendOtp(req.body);
      return res
        .status(200)
        .json({ message: `OTP resent successfully to ${req.body.email}.` });
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred while resending the OTP.",
      );
    }
  };

  validateOtp = async (
    req: Request<unknown, unknown, z.infer<typeof validateOtpSchema>>,
    res: Response,
  ): Promise<Response> => {
    try {
      const result = await this.authUseCases.validateOtp(req.body);
      return res
        .status(200)
        .json({ message: "OTP validated successfully.", data: result });
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred while validating the OTP.",
      );
    }
  };

  verifyEmail = async (
    req: Request<unknown, unknown, z.infer<typeof verifyEmailSchema>>,
    res: Response,
  ): Promise<Response> => {
    try {
      await this.authUseCases.verifyEmail(req.body);
      return res
        .status(200)
        .json({ message: "Email verified successfully. You can now login." });
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred while verifying the email.",
      );
    }
  };

  forgotPassword = async (
    req: Request<unknown, unknown, z.infer<typeof forgotPasswordSchema>>,
    res: Response,
  ): Promise<Response> => {
    try {
      await this.authUseCases.forgotPassword(req.body);
      return res.status(200).json({
        message: "If an account exists with this email, an OTP has been sent.",
      });
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred during forgot password.",
      );
    }
  };

  resetPassword = async (
    req: Request<unknown, unknown, z.infer<typeof resetPasswordSchema>>,
    res: Response,
  ): Promise<Response> => {
    try {
      await this.authUseCases.resetPassword(req.body);
      return res.status(200).json({
        message:
          "Password reset successfully. Please login with your new password.",
      });
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred while resetting the password.",
      );
    }
  };

  private handleError(
    res: Response,
    error: unknown,
    fallback: string,
  ): Response {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
        suggestion: error.suggestion,
      });
    }
    return res.status(500).json({
      message: fallback,
      suggestion: "Please try again later or contact support.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
