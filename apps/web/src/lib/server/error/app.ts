const appErrorCodes = {
  FUNCTION_QUOTA_EXCEEDED: "FUNCTION_QUOTA_EXCEEDED",
} as const;

export class AppError extends Error {
  constructor(
    message: string,
    public readonly appCode: keyof typeof appErrorCodes,
  ) {
    super(message);
  }
}
