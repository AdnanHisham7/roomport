import crypto from "crypto";
import { env } from "../config/env";
import { AppError } from "../../shared/error/app-error";
import {
  IRazorpayOrder,
  IRazorpayRefund,
  IRazorpayService,
} from "../../application/interface/common/razorpay-service.interface";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export class RazorpayService implements IRazorpayService {
  private assertConfigured(): { keyId: string; keySecret: string } {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new AppError(
        "Online payments are not configured on this server.",
        500,
        "Contact support to enable Razorpay online payments.",
      );
    }
    return { keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET };
  }

  private authHeader(keyId: string, keySecret: string): string {
    return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  }

  async createOrder(
    amountInRupees: number,
    receipt: string,
    notes?: Record<string, string>,
  ): Promise<IRazorpayOrder> {
    const { keyId, keySecret } = this.assertConfigured();

    const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader(keyId, keySecret),
      },
      body: JSON.stringify({
        amount: Math.round(amountInRupees * 100),
        currency: "INR",
        receipt,
        notes: notes ?? {},
        payment_capture: 1,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AppError(
        body?.error?.description || "Failed to create Razorpay order.",
        502,
        "Please try again in a moment.",
      );
    }

    return { id: body.id, amount: body.amount, currency: body.currency };
  }

  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const { keySecret } = this.assertConfigured();
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return this.safeCompare(expected, signature);
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      throw new AppError(
        "Razorpay webhook secret is not configured on this server.",
        500,
        "Contact support to enable Razorpay webhooks.",
      );
    }
    const expected = crypto
      .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    return this.safeCompare(expected, signature);
  }

  async createRefund(
    paymentId: string,
    amountInRupees?: number,
  ): Promise<IRazorpayRefund> {
    const { keyId, keySecret } = this.assertConfigured();

    if (!paymentId || !paymentId.startsWith("pay_")) {
      throw new AppError(
        `Invalid Razorpay Payment ID: "${paymentId}". Refund requires a valid payment ID starting with "pay_".`,
        400
      );
    }

    const payload: Record<string, unknown> = {};
    if (amountInRupees !== undefined) {
      payload.amount = Math.round(amountInRupees * 100);
    }

    const response = await fetch(
      `${RAZORPAY_API_BASE}/payments/${paymentId}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authHeader(keyId, keySecret),
        },
        body: JSON.stringify(payload),
      },
    );

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AppError(
        body?.error?.description || "Failed to initiate Razorpay refund.",
        502,
        "Please try again in a moment or retry from the dashboard.",
      );
    }

    return { id: body.id, status: body.status };
  }

  private safeCompare(expectedHex: string, actualHex: string): boolean {
    const expectedBuf = Buffer.from(expectedHex, "hex");
    const actualBuf = Buffer.from(actualHex || "", "hex");
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  }
}
