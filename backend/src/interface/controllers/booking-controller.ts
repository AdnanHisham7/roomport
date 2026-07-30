import type { Request, Response } from "express";
import { AppError } from "../../shared/error/app-error";
import { IBookingUseCases } from "../../application/interface/booking/booking-usecase.interface";
import { BookingStatus } from "../../domain/entities/Booking";
import { logger } from "../../shared/logger/logger";

export class BookingController {
  constructor(private readonly bookingUseCases: IBookingUseCases) {}

  private handleError(
    res: Response,
    error: unknown,
    fallback: string,
  ): Response {
    if (error instanceof AppError)
      return res
        .status(error.statusCode)
        .json({ message: error.message, suggestion: error.suggestion });
    return res.status(500).json({ message: fallback });
  }

  create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const result = await this.bookingUseCases.create(req.body);
      return res
        .status(201)
        .json({ message: "Booking request submitted.", data: result });
    } catch (e) {
      return this.handleError(res, e, "Failed to create booking.");
    }
  };

  verifyPayment = async (req: Request, res: Response): Promise<Response> => {
    try {
      const booking = await this.bookingUseCases.verifyPayment(req.body);
      return res
        .status(200)
        .json({ message: "Payment verified.", data: booking });
    } catch (e) {
      return this.handleError(res, e, "Failed to verify payment.");
    }
  };

  webhook = async (req: Request, res: Response): Promise<Response> => {
    try {
      const signature = req.headers["x-razorpay-signature"] as string;
      await this.bookingUseCases.handleWebhookEvent(req.body, signature);
      return res.status(200).json({ received: true });
    } catch (e) {
      logger.error("Razorpay webhook processing failed:", e);
      if (e instanceof AppError)
        return res.status(e.statusCode).json({ message: e.message });
      return res.status(500).json({ message: "Webhook processing failed." });
    }
  };

  listForOwner = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await this.bookingUseCases.listForOwner(
        user.userId,
        user.role,
        {
          buildingId: req.query.buildingId as string | undefined,
          unitId: req.query.unitId as string | undefined,
          status: req.query.status as BookingStatus | undefined,
        },
        page,
        limit,
      );
      return res.status(200).json(result);
    } catch (e) {
      return this.handleError(res, e, "Failed to fetch bookings.");
    }
  };

  getById = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const booking = await this.bookingUseCases.getById(
        req.params.id as string,
        user.userId,
        user.role,
      );
      return res.status(200).json({ data: booking });
    } catch (e) {
      return this.handleError(res, e, "Failed to fetch booking.");
    }
  };

  confirm = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const booking = await this.bookingUseCases.confirm(
        req.params.id as string,
        user.userId,
        user.role,
      );
      return res
        .status(200)
        .json({ message: "Booking confirmed.", data: booking });
    } catch (e) {
      return this.handleError(res, e, "Failed to confirm booking.");
    }
  };

  reject = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const booking = await this.bookingUseCases.reject(
        req.params.id as string,
        user.userId,
        user.role,
        req.body?.reason,
      );
      return res
        .status(200)
        .json({ message: "Booking rejected.", data: booking });
    } catch (e) {
      return this.handleError(res, e, "Failed to reject booking.");
    }
  };

  refund = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const booking = await this.bookingUseCases.refund(
        req.params.id as string,
        user.userId,
        user.role,
      );
      return res
        .status(200)
        .json({ message: "Refund initiated.", data: booking });
    } catch (e) {
      return this.handleError(res, e, "Failed to initiate refund.");
    }
  };
}
