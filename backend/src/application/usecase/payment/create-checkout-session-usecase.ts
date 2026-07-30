import { IStripeService } from "../../interface/common/stripe-service.interface";
import { IUserRepository } from "../../../domain/repository/user-repository.interface";
import { ISubscriptionRepository } from "../../../domain/repository/subscription-repository.interface";
import { IPlatformSettingRepository } from "../../../domain/repository/platform-setting-repository.interface";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "../../../shared/error/app-error";

export class CreateCheckoutSessionUseCase {
  constructor(
    private stripeService: IStripeService,
    private userRepository: IUserRepository,
    private subscriptionRepository: ISubscriptionRepository,
    private settingRepository: IPlatformSettingRepository,
  ) {}

  async execute(
    userId: string,
    subscriptionId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError("User not found.");

    const subscription =
      await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) throw new NotFoundError("Subscription not found.");
    if (subscription.userId.toString() !== userId) {
      throw new ForbiddenError("This subscription does not belong to you.");
    }
    if (subscription.status === "active" || subscription.status === "paid") {
      throw new BadRequestError(
        "This subscription is already active.",
        "No payment is necessary.",
      );
    }

    const sessionUrl = await this.stripeService.createCheckoutSession(
      subscriptionId,
      user.email,
      subscription.amount,
      successUrl,
      cancelUrl,
    );

    return sessionUrl;
  }

  async executePublic(
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    numberOfBuildings: number,
    numberOfUnits: number,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    if (!numberOfBuildings || numberOfBuildings < 1)
      throw new BadRequestError("numberOfBuildings must be at least 1.");
    if (!numberOfUnits || numberOfUnits < 1)
      throw new BadRequestError("numberOfUnits must be at least 1.");

    const settings = await this.settingRepository.get();
    const amount =
      Math.round(
        (numberOfBuildings * settings.pricePerBuilding +
          numberOfUnits * settings.pricePerUnit) *
          100,
      ) / 100;

    const metadata = {
      firstName,
      lastName,
      email,
      phone,
      numberOfBuildings: numberOfBuildings.toString(),
      numberOfUnits: numberOfUnits.toString(),
      amount: amount.toString(),
    };

    const sessionUrl = await this.stripeService.createPublicCheckoutSession(
      email,
      amount,
      metadata,
      successUrl,
      cancelUrl,
    );

    return sessionUrl;
  }
}
