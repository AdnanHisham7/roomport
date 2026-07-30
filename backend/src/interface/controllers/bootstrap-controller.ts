import type { Request, Response } from "express";
import type { IBootstrapUseCase } from "../../application/interface/common/bootstrap-usecase.interface";
import { AppError } from "../../shared/error/app-error";

export class BootstrapController {
  constructor(private readonly bootstrapUseCase: IBootstrapUseCase) {}

  bootstrap = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { email, password, first_name, last_name, phone_number } = req.body;

      if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({
          message: "Bootstrap failed: Missing required fields.",
          suggestion:
            "Please provide email, password, first_name, and last_name.",
        });
      }
      if (password.length < 8) {
        return res.status(400).json({
          message: "Bootstrap failed: Password too short.",
          suggestion: "Password must be at least 8 characters.",
        });
      }

      const result = await this.bootstrapUseCase.bootstrap({
        email,
        password,
        first_name,
        last_name,
        phone_number,
      });
      return res.status(201).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          message: error.message,
          suggestion: error.suggestion,
        });
      }
      return res.status(500).json({
        message: "Bootstrap failed due to an unexpected error.",
        suggestion: "Please try again or contact support.",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}
