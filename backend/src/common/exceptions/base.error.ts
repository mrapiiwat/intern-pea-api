export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract serialize(): Record<string, unknown>;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
