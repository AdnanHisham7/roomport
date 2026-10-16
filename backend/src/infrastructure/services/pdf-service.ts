import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { env } from "../config/env";
import { cloudinaryService } from "./cloudinary.service";

export interface AgreementPdfData {
  agreementId: string;
  customFilename?: string;
  title: string;
  body: string;
  terms?: string;
  tenantName: string;
  tenantEmail: string;
  propertyName: string;
  monthlyRent: number;
  startDate: Date;
  endDate: Date;
  typedSignatureName: string;
  signedAt: Date;
  verifiedAt: Date;
  completedAt: Date;
  signerIp?: string;
}

function cleanHtmlEntities(str: string): string {
  return str
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/₹/g, "Rs. ");
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, "").trim();
}

function renderHtmlToPdf(doc: PDFKit.PDFDocument, htmlOrText: string) {
  if (!htmlOrText || !htmlOrText.trim()) return;

  const content = cleanHtmlEntities(htmlOrText);

  // If plain text (does not contain HTML tags):
  if (!/<[a-z][\s\S]*>/i.test(content)) {
    const paragraphs = content.split(/\r?\n+/);
    for (const p of paragraphs) {
      const clean = p.trim();
      if (!clean) continue;
      doc.fontSize(10).font("Helvetica").text(clean, { align: "justify", lineGap: 2 });
      doc.moveDown(0.4);
    }
    return;
  }

  // Parse sequential blocks: headings, paragraphs, lists, hr
  const blockRegex = /<(h[1-6]|p|div|ul|ol|hr)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  let match: RegExpExecArray | null;
  let hasMatches = false;

  while ((match = blockRegex.exec(content)) !== null) {
    hasMatches = true;
    const tag = (match[1] || "hr").toLowerCase();
    const inner = match[2] || "";

    if (tag === "hr") {
      doc.moveDown(0.4);
      const startX = doc.page.margins.left;
      const endX = doc.page.width - doc.page.margins.right;
      doc.strokeColor("#d1d5db").lineWidth(1).moveTo(startX, doc.y).lineTo(endX, doc.y).stroke();
      doc.moveDown(0.4);
    } else if (tag === "h1") {
      doc.moveDown(0.4);
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#111827").text(stripHtml(inner));
      doc.fillColor("#000000").moveDown(0.25);
    } else if (tag === "h2") {
      doc.moveDown(0.35);
      doc.fontSize(11.5).font("Helvetica-Bold").fillColor("#1f2937").text(stripHtml(inner));
      doc.fillColor("#000000").moveDown(0.2);
    } else if (tag === "h3" || tag === "h4") {
      doc.moveDown(0.3);
      doc.fontSize(10.5).font("Helvetica-Bold").fillColor("#374151").text(stripHtml(inner));
      doc.fillColor("#000000").moveDown(0.2);
    } else if (tag === "ul" || tag === "ol") {
      const liMatches = inner.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      let itemIndex = 1;
      for (const li of liMatches) {
        const liText = stripHtml(li);
        if (!liText) continue;
        const bullet = tag === "ol" ? `${itemIndex++}. ` : "•  ";
        doc.fontSize(9.5).font("Helvetica").text(`${bullet}${liText}`, { indent: 15, lineGap: 1.5 });
        doc.moveDown(0.15);
      }
      doc.moveDown(0.25);
    } else {
      // <p> or <div>
      const clean = stripHtml(inner);
      if (clean) {
        const isUnderline = /<u[^>]*>/i.test(inner);
        doc.fontSize(9.5).font("Helvetica").text(clean, { align: "justify", lineGap: 2, underline: isUnderline });
        doc.moveDown(0.35);
      }
    }
  }

  // Fallback if blocks weren't cleanly matched
  if (!hasMatches) {
    const clean = stripHtml(content);
    if (clean) {
      doc.fontSize(9.5).font("Helvetica").text(clean, { align: "justify", lineGap: 2 });
      doc.moveDown(0.4);
    }
  }
}

export class PdfService {
  private readonly outputDir: string;

  constructor() {
    this.outputDir = path.resolve(process.cwd(), "uploads", "agreements");
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateAgreementPdf(data: AgreementPdfData): Promise<string> {
    return new Promise((resolve, reject) => {
      const filename =
        data.customFilename ||
        `agreement_${data.agreementId}_${Date.now()}.pdf`;
      const filepath = path.join(this.outputDir, filename);
      const fileUrl = `/uploads/agreements/${filename}`;

      const doc = new PDFDocument({ margin: 60, size: "A4" });
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // ── Header ──────────────────────────────────────────────────────────────
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("DIGITAL RENTAL AGREEMENT", { align: "center" })
        .moveDown(0.3);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#666666")
        .text(`Agreement ID: ${data.agreementId}`, { align: "center" })
        .text(`Generated: ${new Date().toISOString()}`, { align: "center" })
        .fillColor("#000000")
        .moveDown(1.2);

      // ── Title ────────────────────────────────────────────────────────────────
      doc.fontSize(13).font("Helvetica-Bold").text(data.title).moveDown(0.5);

      // ── Property & Rent Details ───────────────────────────────────────────────
      doc
        .fontSize(10.5)
        .font("Helvetica-Bold")
        .text("AGREEMENT DETAILS")
        .moveDown(0.3);

      doc.fontSize(9.5).font("Helvetica");
      const details = [
        ["Property", data.propertyName],
        ["Tenant", data.tenantName],
        ["Monthly Rent", `Rs. ${data.monthlyRent.toLocaleString()}`],
        ["Start Date", data.startDate.toDateString()],
        ["End Date", data.endDate.toDateString()],
      ];
      details.forEach(([label, value]) => {
        doc
          .text(`${label}: `, { continued: true })
          .font("Helvetica-Bold")
          .text(value)
          .font("Helvetica");
      });

      doc.moveDown(0.8);

      // ── Body (Rich HTML or formatted text) ────────────────────────────────────
      doc
        .fontSize(10.5)
        .font("Helvetica-Bold")
        .text("AGREEMENT TERMS & CONDITIONS")
        .moveDown(0.3);

      renderHtmlToPdf(doc, data.body);

      if (data.terms && data.terms.trim()) {
        doc
          .fontSize(10.5)
          .font("Helvetica-Bold")
          .text("ADDITIONAL TERMS & CONDITIONS")
          .moveDown(0.3);

        renderHtmlToPdf(doc, data.terms);
      }

      // ── Digital Signature Block ───────────────────────────────────────────────
      doc
        .fontSize(10.5)
        .font("Helvetica-Bold")
        .text("DIGITAL SIGNATURE")
        .moveDown(0.3);

      doc
        .rect(doc.x, doc.y, 475, 75)
        .strokeColor("#cccccc")
        .stroke()
        .moveDown(0.3);

      doc.fontSize(9).font("Helvetica");
      doc.text(`Signed by:    ${data.typedSignatureName}`, { indent: 10 });
      doc.text(`Date/Time:    ${data.signedAt.toISOString()}`, { indent: 10 });
      doc.text(`OTP Verified: ${data.verifiedAt.toISOString()}`, { indent: 10 });
      doc.text(`Tenant Email: ${data.tenantEmail}`, { indent: 10 });
      if (data.signerIp) {
        doc.text(`IP Address:   ${data.signerIp}`, { indent: 10 });
      }

      doc.moveDown(1.2);

      // ── Completion Stamp ─────────────────────────────────────────────────────
      doc
        .rect(55, doc.y, 485, 32)
        .fillColor("#f0fdf4")
        .fill()
        .fillColor("#000000");

      doc
        .fontSize(9.5)
        .font("Helvetica-Bold")
        .fillColor("#166534")
        .text(
          `✓ DIGITALLY VERIFIED & COMPLETED ON ${data.completedAt.toISOString()}`,
          60,
          doc.y - 23,
          { align: "center" },
        )
        .fillColor("#000000");

      doc.end();

      stream.on("finish", async () => {
        // Try uploading to Cloudinary for permanent global CDN access
        try {
          if (
            env.CLOUDINARY_CLOUD_NAME &&
            env.CLOUDINARY_API_KEY &&
            env.CLOUDINARY_API_SECRET
          ) {
            const buffer = fs.readFileSync(filepath);
            const secureUrl = await cloudinaryService.uploadRaw(
              buffer,
              "agreements",
              filename,
            );
            if (secureUrl) {
              return resolve(secureUrl);
            }
          }
        } catch (uploadErr) {
          console.warn(
            "[PdfService] Cloudinary PDF upload failed, falling back to local file:",
            uploadErr,
          );
        }

        // Fallback: return full backend URL or local file path
        const backendBase = (env.BACKEND_URL || "").replace(/\/$/, "");
        const fallbackUrl = backendBase ? `${backendBase}${fileUrl}` : fileUrl;
        resolve(fallbackUrl);
      });

      stream.on("error", reject);
    });
  }
}

export const defaultPdfService = new PdfService();
