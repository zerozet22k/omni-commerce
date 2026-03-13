import { ModelCrudRepository } from "@/lib/crud/model-crud.repository";
import {
  RefundModel,
  ReturnItemModel,
  ReturnModel,
  ReviewMediaModel,
  ReviewModel,
} from "@/modules/engagement/engagement.models";

export const engagementRepositories = {
  reviews: new ModelCrudRepository(ReviewModel),
  reviewMedia: new ModelCrudRepository(ReviewMediaModel),
  returns: new ModelCrudRepository(ReturnModel),
  returnItems: new ModelCrudRepository(ReturnItemModel),
  refunds: new ModelCrudRepository(RefundModel),
};
