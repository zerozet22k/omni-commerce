import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { ProductModel } from "@/modules/catalog/catalog.models";
import { ReviewModel } from "@/modules/engagement/engagement.models";

export async function syncProductReviewAggregates(productIds: string[]) {
  const normalizedProductIds = Array.from(
    new Set(productIds.filter((productId) => Types.ObjectId.isValid(productId))),
  );

  if (normalizedProductIds.length === 0) {
    return;
  }

  await connectToDatabase();

  const objectIds = normalizedProductIds.map((productId) => new Types.ObjectId(productId));
  const aggregates = (await ReviewModel.aggregate<{
    _id: Types.ObjectId;
    avgRating: number;
    reviewCount: number;
  }>([
    {
      $match: {
        productId: { $in: objectIds },
        isVisible: true,
      },
    },
    {
      $group: {
        _id: "$productId",
        avgRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]).exec()) as Array<{
    _id: Types.ObjectId;
    avgRating: number;
    reviewCount: number;
  }>;

  const aggregateMap = new Map(
    aggregates.map((aggregate) => [
      String(aggregate._id),
      {
        avgRating: Number(aggregate.avgRating.toFixed(2)),
        reviewCount: aggregate.reviewCount,
      },
    ]),
  );

  await Promise.all(
    normalizedProductIds.map((productId) =>
      ProductModel.findByIdAndUpdate(productId, {
        avgRating: aggregateMap.get(productId)?.avgRating ?? 0,
        reviewCount: aggregateMap.get(productId)?.reviewCount ?? 0,
      }).exec(),
    ),
  );
}

export async function syncProductReviewAggregate(productId: string) {
  return syncProductReviewAggregates([productId]);
}
