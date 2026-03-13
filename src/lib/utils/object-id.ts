import { Types } from "mongoose";

import { AppError } from "@/lib/errors/app-error";

export function assertObjectId(value: string, label = "id") {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(`Invalid ${label}.`, 400);
  }
}
