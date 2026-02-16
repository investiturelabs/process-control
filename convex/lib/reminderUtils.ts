import { addDays, addWeeks, addMonths, addYears } from "date-fns";

export type ReminderFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "annually"
  | "custom";

/**
 * Computes the next due date based on frequency and a reference date.
 * Returns an ISO 8601 string.
 */
export function computeNextDueAt(
  frequency: ReminderFrequency,
  fromDate: Date,
  customDays?: number,
): string {
  let next: Date;
  switch (frequency) {
    case "daily":
      next = addDays(fromDate, 1);
      break;
    case "weekly":
      next = addWeeks(fromDate, 1);
      break;
    case "biweekly":
      next = addWeeks(fromDate, 2);
      break;
    case "monthly":
      next = addMonths(fromDate, 1);
      break;
    case "quarterly":
      next = addMonths(fromDate, 3);
      break;
    case "annually":
      next = addYears(fromDate, 1);
      break;
    case "custom":
      if (!customDays || customDays < 1) {
        throw new Error("customDays must be a positive number for custom frequency");
      }
      next = addDays(fromDate, customDays);
      break;
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
  return next.toISOString();
}
