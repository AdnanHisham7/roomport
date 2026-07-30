import { AgreementUseCases } from "../../application/usecase/agreement/agreement-usecase";
import { BuildingUseCases } from "../../application/usecase/building/building-usecase";
import { AuthUseCases } from "../../application/usecase/common/auth-usecase";
import { RegisterUseCase } from "../../application/usecase/common/register-usecase";
import { DocumentUseCases } from "../../application/usecase/document/document-usecase";
import { ExpenseUseCases } from "../../application/usecase/expense/expense-usecase";
import { FloorUseCases } from "../../application/usecase/floor/floor-usecase";
import { BootstrapSuperAdminUseCase } from "../../application/usecase/system/bootstrap-super-admin-usecase";
import { TenantUseCases } from "../../application/usecase/tenant/tenant-usecase";
import { AgreementController } from "../../interface/controllers/agreement-controller";
import { AuthController } from "../../interface/controllers/auth-controller";
import { BootstrapController } from "../../interface/controllers/bootstrap-controller";
import { BuildingController } from "../../interface/controllers/building-controller";
import { DocumentController } from "../../interface/controllers/document-controller";
import { ExpenseController } from "../../interface/controllers/expense-controller";
import { FloorController } from "../../interface/controllers/floor-controller";
import { TenantController } from "../../interface/controllers/tenant-controller";
import { AgreementRepository } from "../repository/agreement-repository";
import { BuildingRepository } from "../repository/building-repository";
import { DocumentRepository } from "../repository/document-repository";
import { ExpenseRepository } from "../repository/expense-repository";
import { FloorRepository } from "../repository/floor-repository";
import { TenantRepository } from "../repository/tenant-repository";
import { UserRepository } from "../repository/user-repository";
import { EmailService } from "../services/email-service";
import { JwtService } from "../services/jwt-service";
import { PdfService } from "../services/pdf-service";
import { RedisOtpService } from "../services/redis-otp-service";
import { SubscriptionRepository } from "../repository/subscription-repository";
import { UnitUseCases } from "../../application/usecase/unit/unit-usecase";
import { UnitController } from "../../interface/controllers/unit-controller";
import { UnitRepository } from "../repository/unit-repository";
import { AnalyticsController } from "../../interface/controllers/analytics-controller";
import { AnalyticsUseCase } from "../../application/usecase/analytics/analytics-usecase";
import { AnalyticsRepository } from "../repository/analytics-repository";
import { NotificationRepositoryImpl } from "../repository/notification-repository";
import { TwilioSmsService } from "../services/twilio-sms.service";
import { NotificationUseCase } from "../../application/usecase/notification/notification-usecase";
import { NotificationController } from "../../interface/controllers/notification-controller";
import { UserUseCase } from "../../application/usecase/user/user-usecase";
import { UserController } from "../../interface/controllers/user-controller";
import { ActivityLogRepositoryImpl } from "../repository/activity-log-repository";
import { ActivityLogUsecaseImpl } from "../../application/interface/activity-log/activity-log-usecase.interface";
import { ActivityLogController } from "../../interface/controllers/activity-log-controller";
import { InquiryRepository } from "../repository/inquiry-repository";
import { PlatformSettingRepository } from "../repository/platform-setting-repository";
import { SuperAdminUseCases } from "../../application/usecase/super-admin/super-admin-usecase";
import { SuperAdminController } from "../../interface/controllers/super-admin-controller";
import { InquiryUseCases } from "../../application/usecase/inquiry/inquiry-usecase";
import { InquiryController } from "../../interface/controllers/inquiry-controller";
import { PublicUseCases } from "../../application/usecase/public/public-usecase";
import { PublicController } from "../../interface/controllers/public-controller";
import { UploadController } from "../../interface/controllers/upload-controller";
import { SubscriptionUseCases } from "../../application/usecase/subscription/subscription-usecase";
import { SubscriptionController } from "../../interface/controllers/subscription-controller";
import { PaymentRecordRepository } from "../repository/payment-record-repository";
import { PaymentRecordController } from "../../interface/controllers/payment-record-controller";
import { BuildingAccessUseCase } from "../../application/usecase/building/building-access-usecase";
import { PaymentRecordUseCases } from "../../application/usecase/payment-record/payment-record-usecase";
import { BookingRepository } from "../repository/booking-repository";
import { RazorpayService } from "../services/razorpay-service";
import { BookingUseCases } from "../../application/usecase/booking/booking-usecase";
import { BookingController } from "../../interface/controllers/booking-controller";
import { TenantPortalTokenService } from "../services/tenant-portal-token-service";
import { TenantPortalUseCases } from "../../application/usecase/tenant-portal/tenant-portal-usecase";
import { TenantPortalController } from "../../interface/controllers/tenant-portal-controller";
import { OfferRepository } from "../repository/offer-repository";
import { OfferUseCases } from "../../application/usecase/offer/offer-usecase";
import { OfferController } from "../../interface/controllers/offer-controller";
import { PlatformTransactionRepository } from "../repository/platform-transaction-repository";
import { BuilderPayoutRepository } from "../repository/builder-payout-repository";
import { ReservedTenantRepository } from "../repository/reserved-tenant-repository";
import { PayoutUseCases } from "../../application/usecase/payout/payout-usecase";
import { PayoutController } from "../../interface/controllers/payout-controller";
import { ReservedTenantUseCases } from "../../application/usecase/reserved-tenant/reserved-tenant-usecase";
import { ReservedTenantController } from "../../interface/controllers/reserved-tenant-controller";

const userRepository = new UserRepository();
const tenantRepository = new TenantRepository();
const documentRepository = new DocumentRepository();
const agreementRepository = new AgreementRepository();
const subscriptionRepository = new SubscriptionRepository();
const unitRepository = new UnitRepository();
const analyticsRepository = new AnalyticsRepository();
const notificationRepository = new NotificationRepositoryImpl();
const buildingRepository = new BuildingRepository();
const floorRepository = new FloorRepository();
const activityLogRepository = new ActivityLogRepositoryImpl();
const expenseRepo = new ExpenseRepository();
const inquiryRepository = new InquiryRepository();
const platformSettingRepository = new PlatformSettingRepository();
const paymentRecordRepository = new PaymentRecordRepository();
const bookingRepository = new BookingRepository();
const offerRepository = new OfferRepository();
const platformTransactionRepository = new PlatformTransactionRepository();
const builderPayoutRepository = new BuilderPayoutRepository();
const reservedTenantRepository = new ReservedTenantRepository();

const jwtService = new JwtService();
const emailService = new EmailService();
const otpService = new RedisOtpService();
const pdfService = new PdfService();
const twilioSmsService = new TwilioSmsService();
const razorpayService = new RazorpayService();
const tenantPortalTokenService = new TenantPortalTokenService();

const activityLogUseCase = new ActivityLogUsecaseImpl(activityLogRepository);
const buildingAccessUseCase = new BuildingAccessUseCase(buildingRepository);
const userUseCase = new UserUseCase(userRepository);
const registerUseCase = new RegisterUseCase(
  userRepository,
  emailService,
  otpService,
);
const bootstrapUseCase = new BootstrapSuperAdminUseCase(userRepository);
const documentUseCases = new DocumentUseCases(documentRepository);
const notificationUseCase = new NotificationUseCase(
  notificationRepository,
  emailService,
  twilioSmsService,
  userRepository,
);
const agreementUseCases = new AgreementUseCases(
  agreementRepository,
  tenantRepository,
  documentRepository,
  emailService,
  pdfService,
);
const unitUseCases = new UnitUseCases(
  unitRepository,
  subscriptionRepository,
  buildingRepository,
  floorRepository,
);
const floorUseCases = new FloorUseCases(
  floorRepository,
  buildingRepository,
  unitUseCases,
  subscriptionRepository,
  unitRepository,
);
const buildingUseCases = new BuildingUseCases(
  buildingRepository,
  floorUseCases,
  subscriptionRepository,
  activityLogUseCase,
  unitRepository,
);
const analyticsUseCase = new AnalyticsUseCase(analyticsRepository);
const tenantUseCases = new TenantUseCases(
  tenantRepository,
  unitRepository,
  activityLogUseCase,
  tenantPortalTokenService,
  emailService,
  reservedTenantRepository,
);
const tenantPortalUseCases = new TenantPortalUseCases(
  tenantRepository,
  unitRepository,
  buildingRepository,
  paymentRecordRepository,
  agreementRepository,
  documentRepository,
  tenantPortalTokenService,
);
const subscriptionUseCases = new SubscriptionUseCases(
  subscriptionRepository,
  platformSettingRepository,
  userRepository,
  activityLogUseCase,
  emailService,
);
const authUseCases = new AuthUseCases(
  userRepository,
  jwtService,
  emailService,
  otpService,
  subscriptionUseCases,
);
const inquiryUseCases = new InquiryUseCases(
  inquiryRepository,
  buildingRepository,
  unitRepository,
  notificationUseCase,
);
const bookingUseCases = new BookingUseCases(
  bookingRepository,
  buildingRepository,
  unitRepository,
  razorpayService,
  notificationUseCase,
  emailService,
  activityLogUseCase,
  platformTransactionRepository,
  platformSettingRepository,
  reservedTenantRepository,
);
const payoutUseCases = new PayoutUseCases(
  userRepository,
  platformTransactionRepository,
  builderPayoutRepository,
  platformSettingRepository,
);
const reservedTenantUseCases = new ReservedTenantUseCases(
  reservedTenantRepository,
  unitRepository,
  buildingAccessUseCase,
);
const publicUseCases = new PublicUseCases(
  buildingRepository,
  unitRepository,
  floorRepository,
  offerRepository,
);
const offerUseCases = new OfferUseCases(
  offerRepository,
  unitRepository,
  buildingRepository,
  buildingAccessUseCase,
  activityLogUseCase,
);
const superAdminUseCases = new SuperAdminUseCases(
  userRepository,
  buildingRepository,
  subscriptionRepository,
  unitRepository,
  inquiryRepository,
  platformSettingRepository,
  activityLogUseCase,
  emailService,
);

class TenantPaymentAdapter {
  constructor(private readonly tenantRepo: typeof tenantRepository) {}
  async findAll(filter?: { buildingId?: string }): Promise<any[]> {
    const tenants = await this.tenantRepo.findAll(filter as any);
    const today = new Date();
    return tenants.map((t) => {
      const hasPaidThisMonth =
        t.paidAt &&
        (t.paidAt as Date).getMonth() === today.getMonth() &&
        (t.paidAt as Date).getFullYear() === today.getFullYear();
      return {
        amount: t.rentAmount,
        status: hasPaidThisMonth ? "completed" : "pending",
        type: "rent",
        paidAt: t.paidAt,
      };
    });
  }
}
const expenseUseCases = new ExpenseUseCases(
  expenseRepo,
  new TenantPaymentAdapter(tenantRepository) as any,
);
const paymentRecordUseCases = new PaymentRecordUseCases(
  paymentRecordRepository,
  tenantRepository,
  buildingAccessUseCase,
  activityLogUseCase,
);

export const authController = new AuthController(authUseCases, registerUseCase);
export const bootstrapController = new BootstrapController(bootstrapUseCase);
export const tenantController = new TenantController(tenantUseCases);
export const documentController = new DocumentController(
  documentUseCases,
  buildingAccessUseCase,
);
export const agreementController = new AgreementController(
  agreementUseCases,
  buildingAccessUseCase,
);
export const unitController = new UnitController(unitUseCases);
export const notificationController = new NotificationController(
  notificationUseCase,
);
export const analyticsController = new AnalyticsController(analyticsUseCase);
export const userController = new UserController(userUseCase);
export const activityLogController = new ActivityLogController(
  activityLogUseCase,
  buildingAccessUseCase,
);
export const buildingController = new BuildingController(
  buildingUseCases,
  userUseCase,
);
export const floorController = new FloorController(floorUseCases);
export const expenseController = new ExpenseController(
  expenseUseCases,
  buildingAccessUseCase,
);
export const superAdminController = new SuperAdminController(
  superAdminUseCases,
  subscriptionUseCases,
);
export const inquiryController = new InquiryController(inquiryUseCases);
export const publicController = new PublicController(publicUseCases);
export const uploadController = new UploadController();
export const subscriptionController = new SubscriptionController(
  subscriptionUseCases,
);
export const paymentRecordController = new PaymentRecordController(
  paymentRecordUseCases,
);
export const bookingController = new BookingController(bookingUseCases);
export const tenantPortalController = new TenantPortalController(
  tenantPortalUseCases,
);
export const offerController = new OfferController(offerUseCases);
export const payoutController = new PayoutController(payoutUseCases);
export const reservedTenantController = new ReservedTenantController(
  reservedTenantUseCases,
);
