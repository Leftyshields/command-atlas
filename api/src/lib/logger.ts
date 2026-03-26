/**
 * In production, log only a short message to avoid leaking stack traces or request details.
 */
export function logError(context: string, err: unknown): void {
  if (process.env.NODE_ENV === "production") {
    console.error(context);
  } else {
    console.error(context, err);
  }
}
