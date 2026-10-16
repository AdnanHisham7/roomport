import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { AgreementModel } from "../../infrastructure/db/model/agreement-model";
import { TenantModel } from "../../infrastructure/db/model/tenant-model";
import { BuildingModel } from "../../infrastructure/db/model/building-model";
import { pdfService } from "../../infrastructure/DIContainer";

/**
 * Serves signed agreement PDFs with resilient on-demand regeneration.
 *
 * Render and similar PaaS providers use ephemeral disk containers. When a container restarts
 * or redeploys, files in /uploads may be lost. This handler checks disk first; if missing,
 * it reconstructs the PDF from the database on-demand and either redirects to Cloudinary
 * or streams the freshly rendered PDF directly to the browser.
 */
export const serveOrRegenerateAgreementPdf = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const paramVal = req.params.filename;
    const filename: string = Array.isArray(paramVal) ? paramVal[0] : (paramVal || "");
    if (!filename || !filename.toLowerCase().endsWith(".pdf")) {
      res.status(404).json({
        success: false,
        message: "Invalid agreement PDF filename.",
        code: "NOT_FOUND",
      });
      return;
    }

    const uploadsDir = path.resolve(process.cwd(), "uploads", "agreements");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, filename);

    // 1. If the file is physically present on disk, stream it immediately
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.sendFile(filePath);
      return;
    }

    // 2. File not found on ephemeral disk — extract agreement ObjectId (24 hex characters)
    const match =
      filename.match(/agreement_([a-f0-9]{24})/i) ||
      filename.match(/([a-f0-9]{24})/i);

    if (!match) {
      res.status(404).json({
        success: false,
        message: "Agreement PDF not found on disk.",
        code: "NOT_FOUND",
      });
      return;
    }

    const agreementId = match[1];
    const agreement = await AgreementModel.findById(agreementId);
    if (!agreement) {
      res.status(404).json({
        success: false,
        message: "Agreement record not found.",
        code: "NOT_FOUND",
      });
      return;
    }

    // 3. If agreement already has an external Cloudinary URL, redirect to it directly
    const isExternalCdn =
      agreement.finalPdfUrl &&
      (agreement.finalPdfUrl.startsWith("http://") ||
        agreement.finalPdfUrl.startsWith("https://")) &&
      !agreement.finalPdfUrl.includes("/uploads/agreements/");

    if (isExternalCdn) {
      res.redirect(agreement.finalPdfUrl!);
      return;
    }

    // 4. Regenerate PDF on-the-fly from MongoDB data
    const tenant = agreement.tenantId
      ? await TenantModel.findById(agreement.tenantId)
      : null;
    const building = agreement.buildingId
      ? await BuildingModel.findById(agreement.buildingId)
      : null;

    const tenantName = tenant
      ? `${tenant.firstName} ${tenant.lastName}`.trim()
      : agreement.typedSignatureName || "Tenant";

    const resultUrl = await pdfService.generateAgreementPdf({
      agreementId: String(agreement._id),
      customFilename: filename,
      title: agreement.title || "Rental Agreement",
      body: agreement.body || "",
      terms: agreement.terms || undefined,
      tenantName,
      tenantEmail: tenant?.email || "",
      propertyName:
        building?.name || (agreement.buildingId as any) || "Rental Property",
      monthlyRent: agreement.monthlyRent || 0,
      startDate: agreement.startDate || new Date(),
      endDate: agreement.endDate || new Date(),
      typedSignatureName: agreement.typedSignatureName || tenantName,
      signedAt:
        agreement.audit?.signedAt || (agreement as any).updatedAt || new Date(),
      verifiedAt:
        agreement.audit?.verifiedAt ||
        (agreement as any).updatedAt ||
        new Date(),
      completedAt:
        agreement.audit?.completedAt ||
        (agreement as any).updatedAt ||
        new Date(),
      signerIp: agreement.audit?.signerIp || "Verified Digital Signer",
    });

    // Update MongoDB finalPdfUrl if changed
    if (resultUrl && resultUrl !== agreement.finalPdfUrl) {
      agreement.finalPdfUrl = resultUrl;
      await agreement.save();
    }

    // If Cloudinary returned a remote CDN URL, redirect to it
    if (resultUrl.startsWith("http://") || resultUrl.startsWith("https://")) {
      res.redirect(resultUrl);
      return;
    }

    // If local file was generated
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.sendFile(filePath);
      return;
    }

    // Check if generated under a different timestamp
    const generatedFilename = path.basename(resultUrl);
    const generatedPath = path.join(uploadsDir, generatedFilename);
    if (fs.existsSync(generatedPath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${generatedFilename}"`,
      );
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.sendFile(generatedPath);
      return;
    }

    res.status(404).json({
      success: false,
      message: "Agreement PDF could not be loaded.",
      code: "NOT_FOUND",
    });
  } catch (err: any) {
    console.error("[AgreementPdfHandler] Failed to serve agreement PDF:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load agreement PDF.",
      error: err.message,
    });
  }
};
