import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

import { USER_ROLES } from "@/lib/auth/permissions";

const userSchema = new Schema(
  {
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: "CUSTOMER",
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 200,
      sparse: true,
      unique: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    gender: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    dateOfBirth: {
      type: Date,
    },
    passwordHash: {
      type: String,
      required: true,
      maxlength: 255,
      select: false,
    },
    emailVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    collection: "users",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
    toJSON: {
      transform: (_document, returnedObject) => {
        const sanitizedObject = returnedObject as Record<string, unknown>;
        delete sanitizedObject.passwordHash;
        return sanitizedObject;
      },
    },
  },
);

export type UserSchema = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserSchema>;

export const UserModel =
  models.User || model<UserSchema>("User", userSchema);
