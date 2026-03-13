import { compare, hash } from "bcryptjs";

import type { UserRole } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors/app-error";
import { CustomerProfileRepository } from "@/modules/users/customer-profile.repository";
import {
  UserRepository,
} from "@/modules/users/user.repository";
import {
  loginUserSchema,
  registerUserSchema,
  type LoginUserInput,
  type RegisterUserInput,
} from "@/modules/users/user.validation";
import { type UserDocument } from "@/modules/users/user.model";

export type PublicUser = {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  phone: string | null;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toPublicUser(user: UserDocument): PublicUser {
  const typedUser = user as UserDocument & {
    role: UserRole;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    emailVerified: boolean;
    isActive: boolean;
    lastLoginAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };

  return {
    id: typedUser._id.toString(),
    role: typedUser.role,
    fullName: typedUser.fullName,
    email: typedUser.email ?? null,
    phone: typedUser.phone ?? null,
    emailVerified: typedUser.emailVerified,
    isActive: typedUser.isActive,
    lastLoginAt: typedUser.lastLoginAt ?? null,
    createdAt: typedUser.createdAt,
    updatedAt: typedUser.updatedAt,
  };
}

export class UserService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly customerProfileRepository = new CustomerProfileRepository(),
  ) {}

  async registerCustomer(input: RegisterUserInput) {
    const payload = registerUserSchema.parse(input);
    const existingUser = await this.userRepository.findByEmail(payload.email);

    if (existingUser) {
      throw new AppError("An account with this email already exists.", 409);
    }

    const passwordHash = await hash(payload.password, 12);
    const user = await this.userRepository.create({
      role: "CUSTOMER",
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      passwordHash,
    });

    await this.customerProfileRepository.createForUser(user._id.toString());

    return toPublicUser(user);
  }

  async authenticate(input: LoginUserInput) {
    const payload = loginUserSchema.parse(input);
    const user = await this.userRepository.findByEmail(payload.email);
    const typedUser = user as
      | (UserDocument & {
          passwordHash?: string;
          isActive: boolean;
        })
      | null;

    if (!typedUser || !typedUser.passwordHash) {
      throw new AppError("Invalid email or password.", 401);
    }

    if (!typedUser.isActive) {
      throw new AppError("This account is inactive.", 403);
    }

    const isPasswordValid = await compare(
      payload.password,
      typedUser.passwordHash,
    );

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password.", 401);
    }

    const updatedUser = await this.userRepository.updateLastLogin(
      typedUser._id.toString(),
    );

    return toPublicUser(updatedUser ?? typedUser);
  }

  async getById(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return null;
    }

    return toPublicUser(user);
  }
}

export const userService = new UserService();
