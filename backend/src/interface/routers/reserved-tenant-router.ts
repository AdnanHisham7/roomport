import { Router } from "express";
import { ReservedTenantController } from "../controllers/reserved-tenant-controller";
import { authenticate, authorize } from "../middleware/auth-middleware";
import { UserRole } from "../../shared/enums/SystemRoles.enum";

export const createReservedTenantRouter = (
  controller: ReservedTenantController,
): Router => {
  const router = Router();
  router.use(authenticate);
  router.use(authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN));

  router.get("/unit/:unitId", controller.getByUnit);

  return router;
};
