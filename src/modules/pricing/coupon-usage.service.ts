import { CouponUsageLogModel, PromotionModel } from "@/modules/pricing/pricing.models";

class CouponUsageService {
  async recordUsage(input: {
    code?: string | null;
    customerId?: string | null;
    orderId?: string | null;
  }) {
    const code = input.code?.trim().toUpperCase();

    if (!code) {
      return null;
    }

    try {
      const promotion = await PromotionModel.findOne({ code })
        .select("_id usageCount")
        .lean()
        .exec();

      if (!promotion) {
        return null;
      }

      const existing = input.orderId
        ? await CouponUsageLogModel.findOne({
            promotionId: promotion._id,
            orderId: input.orderId,
          })
            .select("_id")
            .lean()
            .exec()
        : null;

      if (existing) {
        return existing;
      }

      const usage = await CouponUsageLogModel.create({
        promotionId: promotion._id,
        customerId: input.customerId || undefined,
        orderId: input.orderId || undefined,
        usedCode: code,
        usedAt: new Date(),
      });

      await PromotionModel.findByIdAndUpdate(promotion._id, {
        $inc: { usageCount: 1 },
      }).exec();

      return usage;
    } catch {
      return null;
    }
  }
}

export const couponUsageService = new CouponUsageService();
