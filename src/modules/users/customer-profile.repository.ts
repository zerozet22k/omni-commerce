import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { CustomerProfileModel } from "@/modules/users/customer-profile.model";

export class CustomerProfileRepository {
  async createForUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user id.");
    }

    await connectToDatabase();
    return CustomerProfileModel.create({ userId });
  }
}
