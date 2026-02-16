/** Max lengths for input validation */
export const MAX_LENGTHS = {
  name: 200,
  email: 254,
  text: 2000,
  criteria: 5000,
  riskCategory: 200,
  icon: 50,
  url: 2048,
} as const;

/**
 * Validates that a string does not exceed a maximum length.
 * Throws with a descriptive error if it does.
 */
export function validateLength(value: string, field: string, max: number) {
  if (value.length > max) {
    throw new Error(`${field} exceeds maximum length of ${max} characters`);
  }
}

/**
 * Trims and validates a string field. Returns the trimmed value.
 */
export function sanitize(value: string, field: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${field} cannot be empty`);
  }
  validateLength(trimmed, field, max);
  return trimmed;
}

/**
 * Validates an email format and returns the lowercase, trimmed email.
 */
export function sanitizeEmail(value: string, field: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) {
    throw new Error(`${field} cannot be empty`);
  }
  validateLength(trimmed, field, MAX_LENGTHS.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error(`${field} is not a valid email address`);
  }
  return trimmed;
}

/**
 * Validates a URL field. Must start with https:// if provided.
 */
export function validateUrl(value: string | undefined, field: string): void {
  if (!value) return;
  validateLength(value, field, MAX_LENGTHS.url);
  if (!value.startsWith("https://")) {
    throw new Error(`${field} must start with https://`);
  }
}

/**
 * Validates point values for questions.
 * pointsYes >= pointsPartial >= pointsNo >= 0
 */
export function validatePoints(pointsYes: number, pointsPartial: number, pointsNo: number): void {
  if (pointsYes < 0 || pointsPartial < 0 || pointsNo < 0) {
    throw new Error("Point values must be non-negative");
  }
  if (!Number.isInteger(pointsYes) || !Number.isInteger(pointsPartial) || !Number.isInteger(pointsNo)) {
    throw new Error("Point values must be integers");
  }
  if (pointsYes < pointsPartial) {
    throw new Error("pointsYes must be >= pointsPartial");
  }
  if (pointsPartial < pointsNo) {
    throw new Error("pointsPartial must be >= pointsNo");
  }
}
