import { logger } from "../../../shared/logger/logger";
import Stripe from "stripe";
import bcrypt from "bcryptjs";
import { IStripeService } from "../../interface/common/stripe-service.interface";
import { IUserRepository } from "../../../domain/repository/user-repository.interface";
import { ISubscriptionRepository } from "../../../domain/repository/subscription-repository.interface";
import { IEmailService } from "../../interface/common/email-service-usecase.interface";

export class HandleWebhookUseCase {
  constructor(
    private stripeService: IStripeService,
    private userRepository: IUserRepository,
    private subscriptionRepository: ISubscriptionRepository,
    private emailService: IEmailService,
  ) {}

  async execute(payload: string | Buffer, signature: string): Promise<void> {
    const event = this.stripeService.constructWebhookEvent(
      payload,
      signature,
    ) as Stripe.Event;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;

        if (session.mode === "payment") {
          // If metadata exists, it's a public checkout where we create the user
          if (session.metadata && session.metadata.email) {
            const {
              firstName,
              lastName,
              email,
              phone,
              numberOfBuildings,
              numberOfUnits,
              amount,
            } = session.metadata;
            const stripePaymentId = session.payment_intent as string;

            let user = await this.userRepository.findByEmail(email);

            if (!user) {
              const rawPassword = Math.random().toString(36).slice(-8);
              const hashedPassword = await bcrypt.hash(rawPassword, 10);

              user = await this.userRepository.create({
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                first_name: firstName,
                last_name: lastName,
                phone_number: phone || "",
                role: "admin",
                status: "active",
                email_verified: true,
                phone_verified: false,
                paymentStatus: true,
                refresh_token: null,
              });

              const name = `${firstName} ${lastName}`.trim();
              await this.emailService
                .sendWelcomeCredentials(user.email, name, rawPassword)
                .catch((err) => logger.error(String(err)));
            } else {
              await this.userRepository.update(user._id!, {
                paymentStatus: true,
              });
            }

            const now = new Date();
            const yearFromNow = new Date(now);
            yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);

            const subscription = await this.subscriptionRepository.create({
              userId: user._id!,
              amount: Number(amount),
              numberOfBuildings: Number(numberOfBuildings),
              numberOfUnits: Number(numberOfUnits),
              billingCycle: "yearly",
              currentPeriodStart: now,
              currentPeriodEnd: yearFromNow,
              dueDate: yearFromNow,
              status: "paid",
              paidAt: now,
              stripePaymentId,
              paymentMethod: "stripe",
            });

            await this.userRepository.update(user._id!, {
              subscriptionId: subscription._id,
            });
          } else if (session.client_reference_id) {
            // Legacy/Existing user payment flow
            const subscriptionId = session.client_reference_id;
            const stripePaymentId = session.payment_intent as string;

            await this.subscriptionRepository.update(subscriptionId, {
              status: "paid",
              paidAt: new Date(),
              stripePaymentId,
            });
            const sub =
              await this.subscriptionRepository.findById(subscriptionId);
            if (sub) {
              await this.userRepository.update(sub.userId, {
                paymentStatus: true,
                subscriptionId: sub._id,
              });
            }
          }
        }
        break;
      }
    }
  }
}
