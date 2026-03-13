import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel, type UserDocument, type UserSchema } from "@/modules/users/user.model";

type CreateUserInput = {
  role: UserSchema["role"];
  fullName: string;
  email: string;
  phone?: string;
  passwordHash: string;
};

export class UserRepository {
  async findByEmail(email: string): Promise<UserDocument | null> {
    await connectToDatabase();
    return UserModel.findOne({ email }).select("+passwordHash").exec();
  }

  async findById(userId: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    await connectToDatabase();
    return UserModel.findById(userId).exec();
  }

  async create(input: CreateUserInput): Promise<UserDocument> {
    await connectToDatabase();
    return UserModel.create({
      role: input.role,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash: input.passwordHash,
      registrationDate: new Date(),
    });
  }

  async updateLastLogin(userId: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    await connectToDatabase();
    return UserModel.findByIdAndUpdate(
      userId,
      { lastLoginAt: new Date() },
      { new: true },
    ).exec();
  }
}
