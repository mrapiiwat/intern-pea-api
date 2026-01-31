import type { Elysia, ValidationError } from "elysia";
import {
  AppError,
  BadRequestError,
  InternalServerError,
  ValidationError as MyValidationError,
  NotFoundError,
  UnauthorizedError,
  type ValidationDetail,
} from "@/common/exceptions";

export const errorMiddleware = (app: Elysia) =>
  app.onError(({ code, error, set, request }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return error.serialize();
    }

    switch (code) {
      case "VALIDATION": {
        const vError = error as ValidationError;
        const details: ValidationDetail[] = vError.all.map((e) => {
          const raw = e.path ?? "unknown";
          const clean = raw.startsWith("/") ? raw.slice(1) : raw;
          return { field: clean, message: e.message };
        });

        const myErr = new MyValidationError("Validation failed", details);
        set.status = myErr.statusCode;
        return myErr.serialize();
      }

      case "NOT_FOUND":
        set.status = 404;
        return new NotFoundError("Route not found").serialize();

      case "PARSE":
        set.status = 400;
        return new BadRequestError("Invalid JSON format").serialize();

      case "INVALID_COOKIE_SIGNATURE":
        set.status = 401;
        return new UnauthorizedError("Invalid cookie signature").serialize();

      case "INVALID_FILE_TYPE":
        set.status = 400;
        return new BadRequestError("Invalid file type").serialize();
    }

    console.error("[🔥 SYSTEM ERROR]");
    console.error(`Time: ${new Date().toISOString()}`);
    console.error(`Route: ${request.method} ${request.url}`);
    console.error(`Code: ${code}`);
    console.error(error);

    set.status = 500;
    return new InternalServerError(
      "Something went wrong. Please try again later."
    ).serialize();
  });
