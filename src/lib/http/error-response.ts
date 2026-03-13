import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/lib/errors/app-error";

export function createErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { message: error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "ValidationError"
  ) {
    const validationError = error as {
      errors?: Record<string, { message?: string }>;
    };
    const firstIssue = Object.values(validationError.errors ?? {})[0];

    return NextResponse.json(
      { message: firstIssue?.message ?? "Validation failed." },
      { status: 400 },
    );
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === 11000
  ) {
    return NextResponse.json(
      { message: "Duplicate value violates a unique constraint." },
      { status: 409 },
    );
  }

  if (error instanceof Error && process.env.NODE_ENV !== "production") {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Something went wrong." },
    { status: 500 },
  );
}
