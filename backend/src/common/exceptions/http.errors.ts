import { AppError } from "./base.error";

abstract class HttpError extends AppError {
  abstract statusCode: number;
  abstract errorKey: string;

  serialize() {
    return {
      success: false,
      error: this.errorKey,
      message: this.message,
    };
  }
}

export class BadRequestError extends HttpError {
  statusCode = 400;
  errorKey = "BAD_REQUEST";
}

export class UnauthorizedError extends HttpError {
  statusCode = 401;
  errorKey = "UNAUTHORIZED";
}

export class ForbiddenError extends HttpError {
  statusCode = 403;
  errorKey = "FORBIDDEN";
}

export class NotFoundError extends HttpError {
  statusCode = 404;
  errorKey = "NOT_FOUND";
}

export class MethodNotAllowedError extends HttpError {
  statusCode = 405;
  errorKey = "METHOD_NOT_ALLOWED";
}

export class ConflictError extends HttpError {
  statusCode = 409;
  errorKey = "CONFLICT";
}

export type ValidationDetail = {
  field: string;
  message: string;
};

export class ValidationError extends AppError {
  statusCode = 422;

  constructor(
    message: string,
    public details?: ValidationDetail[]
  ) {
    super(message);
  }

  serialize() {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: this.message,
      details: this.details,
    };
  }
}

export class TooManyRequestsError extends HttpError {
  statusCode = 429;
  errorKey = "TOO_MANY_REQUESTS";
}

export class InternalServerError extends HttpError {
  statusCode = 500;
  errorKey = "INTERNAL_SERVER_ERROR";
}
export class ServiceUnavailableError extends HttpError {
  statusCode = 503;
  errorKey = "SERVICE_UNAVAILABLE";
}
