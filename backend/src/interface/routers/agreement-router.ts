import { Router } from "express";
import { UserRole } from "../../shared/enums/SystemRoles.enum";
import { AgreementController } from "../controllers/agreement-controller";
import { authenticate, authorize } from "../middleware/auth-middleware";
import { validate } from "../middleware/validate-middleware";
import { createAgreementSchema } from "../validators/domain.validator";

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER];

export const createAgreementRouter = (c: AgreementController): Router => {
  const router = Router();

  // ── Admin routes (authenticated + role-based) ──────────────────────────────
  router.post(
    "/create",
    authenticate,
    authorize(...ADMIN_ROLES),
    validate(createAgreementSchema),
    c.create,
  );
  router.get("/all", authenticate, authorize(...ADMIN_ROLES), c.getAll);
  router.get(
    "/agreement/:id",
    authenticate,
    authorize(...ADMIN_ROLES),
    c.getById,
  );
  router.post(
    "/agreement/:id/send",
    authenticate,
    authorize(...ADMIN_ROLES),
    c.sendSigningLink,
  );
  router.patch(
    "/agreement/:id/cancel",
    authenticate,
    authorize(...ADMIN_ROLES),
    c.cancel,
  );
  router.get(
    "/agreement/:id/download",
    authenticate,
    authorize(...ADMIN_ROLES),
    c.downloadPdf,
  );

  router.get("/sign/:token", c.viewByToken);
  router.post("/sign/:token/initiate", c.initiateSigning);
  router.post("/sign/:token/verify-otp", c.verifySigningOtp);
  router.get("/sign/:token/download", c.downloadPdfByToken);

  return router;
};
