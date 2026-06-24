import type { FieldError, FieldErrors } from "react-hook-form";

/** Show validation message after first submit attempt (enterprise default). */
export function resolveFieldError(
  isSubmitted: boolean,
  error?: FieldError | string
): string | undefined {
  if (!isSubmitted || !error) return undefined;
  return typeof error === "string" ? error : error.message;
}

export function resolveNestedFieldError(
  isSubmitted: boolean,
  errors: FieldErrors,
  path: string
): string | undefined {
  if (!isSubmitted) return undefined;
  const parts = path.split(".");
  let current: unknown = errors;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  if (!current) return undefined;
  if (typeof current === "string") return current;
  if (typeof current === "object" && "message" in current) {
    const message = (current as FieldError).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}

export function fieldInvalid(isSubmitted: boolean, error?: FieldError | string): boolean {
  return Boolean(isSubmitted && error);
}
