import { ModelCrudService } from "@/lib/crud/model-crud.service";
import { engagementRepositories } from "@/modules/engagement/engagement.repository";

export const engagementCrudServices = {
  reviews: new ModelCrudService("Review", engagementRepositories.reviews, {
    createdAt: -1,
  }),
  reviewMedia: new ModelCrudService(
    "Review media",
    engagementRepositories.reviewMedia,
  ),
  returns: new ModelCrudService("Return", engagementRepositories.returns, {
    requestedAt: -1,
  }),
  returnItems: new ModelCrudService(
    "Return item",
    engagementRepositories.returnItems,
  ),
  refunds: new ModelCrudService("Refund", engagementRepositories.refunds, {
    createdAt: -1,
  }),
};
