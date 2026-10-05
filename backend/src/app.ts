import { env } from "./infrastructure/config/env";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import authRoutes from "./interface/routers/auth-router";
import systemRoutes from "./interface/routers/bootstrap-router";
import { createTenantRouter } from "./interface/routers/tenant-router";
import { createDocumentRouter } from "./interface/routers/document-router";
import { globalErrorHandler } from "./interface/middleware/errorhandle-middleware";
import {
  documentController,
  tenantController,
  agreementController,
  buildingController,
  floorController,
  expenseController,
  // paymentController,
  unitController,
  userController,
  activityLogController,
  notificationController,
  analyticsController,
  superAdminController,
  inquiryController,
  publicController,
  uploadController,
  subscriptionController,
  paymentRecordController,
  bookingController,
  tenantPortalController,
  offerController,
  payoutController,
  reservedTenantController,
} from "./infrastructure/DIContainer";
import { createAgreementRouter } from "./interface/routers/agreement-router";
import { createPaymentRouter } from "./interface/routers/payment-router";
import { createUnitRouter } from "./interface/routers/unit-router";
import { createExpenseRouter } from "./interface/routers/expense-router";
import {
  createBuildingRouter,
  createFloorRouter,
} from "./interface/routers/building-router";
import { createUserRouter } from "./interface/routers/user-router";
import { activityLogRouter } from "./interface/routers/activity-log-router";
import { notificationRouter } from "./interface/routers/notification-router";
import { createAnalyticsRouter } from "./interface/routers/analytics-router";
import { createSuperAdminRouter } from "./interface/routers/super-admin-router";
import { createInquiryRouter } from "./interface/routers/inquiry-router";
import { createPublicRouter } from "./interface/routers/public-router";
import { createUploadRouter } from "./interface/routers/upload-router";
import { createSubscriptionRouter } from "./interface/routers/subscription-router";
import { createPaymentRecordRouter } from "./interface/routers/payment-record-router";
import { createBookingRouter } from "./interface/routers/booking-router";
import { createTenantPortalRouter } from "./interface/routers/tenant-portal-router";
import { createOfferRouter } from "./interface/routers/offer-router";
import { createPayoutRouter } from "./interface/routers/payout-router";
import { createReservedTenantRouter } from "./interface/routers/reserved-tenant-router";

const createApp = (): Application => {
  const app = express();
  app.use(morgan("dev"));
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  const allowedOrigins = [
    env.APP_URL,
    env.FRONTEND_URL,
    "https://roomport.noxwing.site",
    "http://roomport.noxwing.site",
    "http://localhost:3000",
    "http://localhost:5173",
  ]
    .filter(Boolean)
    .map((url) => url.replace(/\/$/, ""));

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) return callback(null, true);
        const normalized = requestOrigin.replace(/\/$/, "");
        if (
          allowedOrigins.includes(normalized) ||
          normalized.endsWith(".noxwing.site") ||
          normalized.includes("localhost")
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please try again later.",
    },
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many login attempts, please try again later.",
    },
  });

  // Stripe webhook needs raw body
  app.use(
    "/api/v1/payments/webhook",
    express.raw({ type: "application/json" }),
  );
  // Razorpay webhook needs raw body
  app.use(
    "/api/v1/bookings/webhook",
    express.raw({ type: "application/json" }),
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  // app.use(globalLimiter);

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: "Brift API is running 🚀",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/system", systemRoutes);
  app.use("/api/v1/tenants", createTenantRouter(tenantController));
  app.use("/api/v1/documents", createDocumentRouter(documentController));
  app.use("/api/v1/agreements", createAgreementRouter(agreementController));
  // app.use("/api/v1/payments", createPaymentRouter(paymentController));
  app.use("/api/v1/units", createUnitRouter(unitController));
  app.use("/api/v1/expenses", createExpenseRouter(expenseController));
  app.use(
    "/api/v1/buildings",
    createBuildingRouter(buildingController, floorController),
  );
  app.use("/api/v1/floors", createFloorRouter(floorController));
  app.use("/api/v1/users", createUserRouter(userController));
  app.use("/api/v1/activity-logs", activityLogRouter(activityLogController));
  app.use("/api/v1/notifications", notificationRouter(notificationController));
  app.use("/api/v1/analytics", createAnalyticsRouter());
  app.use(
    "/api/v1/subscriptions",
    createSubscriptionRouter(subscriptionController),
  );
  app.use("/api/v1/uploads", createUploadRouter(uploadController));
  app.use("/api/v1/inquiries", createInquiryRouter(inquiryController));
  app.use("/api/v1/super-admin", createSuperAdminRouter(superAdminController));
  app.use("/api/v1/public", createPublicRouter(publicController));
  app.use(
    "/api/v1/payment-records",
    createPaymentRecordRouter(paymentRecordController),
  );
  app.use("/api/v1/bookings", createBookingRouter(bookingController));
  app.use(
    "/api/v1/tenant-portal",
    createTenantPortalRouter(tenantPortalController),
  );
  app.use("/api/v1/offers", createOfferRouter(offerController));
  app.use("/api/v1/payouts", createPayoutRouter(payoutController));
  app.use(
    "/api/v1/reserved-tenants",
    createReservedTenantRouter(reservedTenantController),
  );

  app.use((_req: Request, res: Response) =>
    res
      .status(404)
      .json({ success: false, message: "Route not found", code: "NOT_FOUND" }),
  );
  app.use(globalErrorHandler);
  return app;
};

export default createApp;
