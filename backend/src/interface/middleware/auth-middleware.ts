import type { Request, Response, NextFunction } from "express";
import { TokenPayload } from "../../application/interface/common/jwt-service-usecase.interface";
import { JwtService } from "../../infrastructure/services/jwt-service";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const jwtService = new JwtService();
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Authentication failed: No token provided.",
        suggestion:
          "Please include a valid Bearer token in the Authorization header.",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const payload = jwtService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Authentication failed: Invalid or expired token.",
      suggestion: "Please login again or use your refresh token.",
    });
  }
};
export const authorize =
  (...allowedRoles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role;

    if (!role) {
      res.status(401).json({
        message: "Authorization failed: No role found in token.",
        suggestion: "Please login again to get a fresh token.",
      });
      return;
    }

    if (!allowedRoles.includes(role)) {
      res.status(403).json({
        message: `Authorization failed: Role '${role}' is not permitted.`,
        suggestion: `Allowed roles: ${allowedRoles.join(", ")}.`,
      });
      return;
    }

    next();
  };
