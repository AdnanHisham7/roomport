import { Router } from "express";
import { PayoutController } from "../controllers/payout-controller";
import { authenticate, authorize } from "../middleware/auth-middleware";
import { UserRole } from "../../shared/enums/SystemRoles.enum";

export const createPayoutRouter = (controller: PayoutController): Router => {
  const router = Router();
  router.use(authenticate);

  router.get(
    "/me/balance",
    authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
    controller.getMyBalance,
  );
  router.get(
    "/me/transactions",
    authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
    controller.getMyTransactions,
  );

  router.get(
    "/builders",
    authorize(UserRole.SUPER_ADMIN),
    controller.getAllBuilderBalances,
  );
  router.get(
    "/builders/:builderId",
    authorize(UserRole.SUPER_ADMIN),
    controller.getBuilderBalance,
  );
  router.post(
    "/builders/:builderId/mark-paid",
    authorize(UserRole.SUPER_ADMIN),
    controller.markPayoutPaid,
  );
  router.get(
    "/summary",
    authorize(UserRole.SUPER_ADMIN),
    controller.getPlatformSummary,
  );
  router.get(
    "/transactions",
    authorize(UserRole.SUPER_ADMIN),
    controller.getAllTransactions,
  );

  return router;
};
