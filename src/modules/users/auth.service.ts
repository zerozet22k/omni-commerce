import { getRolePermissions } from "@/lib/auth/permissions";
import { userService, type PublicUser } from "@/modules/users/user.service";
import type {
  LoginUserInput,
  RegisterUserInput,
} from "@/modules/users/user.validation";

export type SessionUser = PublicUser & {
  permissions: string[];
};

function withPermissions(user: PublicUser): SessionUser {
  return {
    ...user,
    permissions: getRolePermissions(user.role),
  };
}

export class AuthService {
  async register(input: RegisterUserInput) {
    const user = await userService.registerCustomer(input);
    return withPermissions(user);
  }

  async login(input: LoginUserInput) {
    const user = await userService.authenticate(input);
    return withPermissions(user);
  }

  async getSessionUser(userId: string) {
    const user = await userService.getById(userId);

    if (!user) {
      return null;
    }

    return withPermissions(user);
  }
}

export const authService = new AuthService();
