import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { Role, SubscriptionStatus } from "@repo/database";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getPrice(): number {
    return Number(
      this.config.get("ZARINPAL_AMOUNT") ??
        this.config.get("PRO_PRICE_RIALS") ??
        490000,
    );
  }

  async getCurrent(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      orderBy: { periodEnd: "desc" },
    });
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return {
      userId,
      role: user.role,
      status: subscription?.status ?? "none",
      periodEnd: subscription?.periodEnd ?? null,
      amount: subscription?.amount ?? this.getPrice(),
      features: ["advanced-analytics", "saved-searches", "alerts"],
    };
  }

  async requestPayment(userId: string, email: string) {
    const merchant = this.config.get<string>("ZARINPAL_MERCHANT_ID");
    if (!merchant) {
      throw new BadRequestException("Zarinpal is not configured");
    }

    const amount = this.getPrice();
    const callbackUrl =
      this.config.get<string>("ZARINPAL_CALLBACK_URL") ??
      `${this.config.getOrThrow<string>("CORE_API_PUBLIC_URL")}/billing/zarinpal/callback`;
    const { requestUrl } = this.endpoints();

    const pending = await this.prisma.subscription.create({
      data: {
        userId,
        status: SubscriptionStatus.PENDING,
        amount,
        gateway: "zarinpal",
      },
    });

    const data = await postJson(requestUrl, {
      merchant_id: merchant,
      amount,
      callback_url: `${callbackUrl}?subscriptionId=${pending.id}`,
      description: "JobGraph Pro — 30 days",
      metadata: { email, subscription_id: pending.id },
    });

    const authority = data?.data?.authority as string | undefined;
    const code = data?.data?.code as number | undefined;
    if (!authority || code !== 100) {
      this.logger.warn(`Zarinpal request failed: ${JSON.stringify(data)}`);
      throw new BadRequestException("Payment request failed");
    }

    await this.prisma.subscription.update({
      where: { id: pending.id },
      data: { authority },
    });

    return {
      authority,
      startUrl: `${this.endpoints().startPayUrl}${authority}`,
    };
  }

  async handleCallback(authority: string, status: string) {
    const frontend =
      this.config.get<string>("FRONTEND_URL") ??
      this.config.getOrThrow<string>("CORS_ORIGIN");
    const fail = `${frontend}/billing/callback?status=failed`;
    if (status !== "OK") {
      return fail;
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { authority },
    });
    if (!subscription) {
      return fail;
    }

    const merchant = this.config.get<string>("ZARINPAL_MERCHANT_ID");
    if (!merchant) return fail;

    const { verifyUrl } = this.endpoints();
    const data = await postJson(verifyUrl, {
      merchant_id: merchant,
      amount: subscription.amount,
      authority,
    });

    const code = data?.data?.code as number | undefined;
    const refId = data?.data?.ref_id as string | number | undefined;
    if (code !== 100 && code !== 101) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.CANCELED },
      });
      return fail;
    }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);

    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          refId: refId != null ? String(refId) : null,
          periodStart,
          periodEnd,
        },
      }),
      this.prisma.user.update({
        where: { id: subscription.userId },
        data: { role: Role.PRO },
      }),
    ]);

    return `${frontend}/billing/callback?status=ok`;
  }

  @Cron("0 3 * * *")
  async expireSubscriptions(): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        periodEnd: { lt: now },
      },
    });

    for (const sub of expired) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: sub.userId },
      });
      if (user?.role === Role.ADMIN) continue;
      const stillActive = await this.prisma.subscription.findFirst({
        where: {
          userId: sub.userId,
          status: SubscriptionStatus.ACTIVE,
          periodEnd: { gte: now },
        },
      });
      if (!stillActive) {
        await this.prisma.user.update({
          where: { id: sub.userId },
          data: { role: Role.USER },
        });
      }
    }

    if (expired.length > 0) {
      this.logger.log(`Expired ${expired.length} subscription(s)`);
    }
  }

  private endpoints() {
    const sandbox = this.config.get("ZARINPAL_SANDBOX") !== "false";
    const host = sandbox
      ? "https://sandbox.zarinpal.com"
      : "https://api.zarinpal.com";
    const payHost = sandbox
      ? "https://sandbox.zarinpal.com"
      : "https://www.zarinpal.com";
    return {
      requestUrl: `${host}/pg/v4/payment/request.json`,
      verifyUrl: `${host}/pg/v4/payment/verify.json`,
      startPayUrl: `${payHost}/pg/StartPay/`,
    };
  }
}

async function postJson(url: string, body: unknown): Promise<{ data?: { authority?: string; code?: number; ref_id?: string | number } }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await response.json()) as {
    data?: { authority?: string; code?: number; ref_id?: string | number };
  };
}
