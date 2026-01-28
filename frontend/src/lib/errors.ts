import type { ApiError } from "@/types/api";

type FastApiDetailItem = {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
};

type ApiErrorLike = {
  code?: string;
  message?: string;
  detail?: unknown;
};

const isApiError = (error: unknown): error is ApiErrorLike => {
  return Boolean(error && typeof error === "object" && "message" in (error as ApiErrorLike));
};

const extractDetailMessage = (detail: unknown): string | null => {
  if (typeof detail === "string" && detail.trim().length > 0) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as FastApiDetailItem;
    if (first && typeof first === "object" && typeof first.msg === "string") {
      return first.msg;
    }
  }
  if (detail && typeof detail === "object" && "msg" in (detail as FastApiDetailItem)) {
    const msg = (detail as FastApiDetailItem).msg;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  return null;
};

const toCamelCase = (value: string) => value.replace(/_([a-z])/g, (_, char) => String(char).toUpperCase());

const FIELD_NAME_MAP: Record<string, string> = {
  budget_type: "budgetType",
  budget_amount: "budgetAmount",
  voting_deadline: "votingDeadline",
  location_region: "locationRegion",
  participant_count_estimate: "participantCountEstimate",
  proposed_activity_ids: "proposedActivityIds",
  time_window: "timeWindow",
  from_week: "fromWeek",
  to_week: "toWeek",
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (isApiError(error)) {
    const detailMessage = extractDetailMessage(error.detail);
    if (detailMessage) return detailMessage;
    if (typeof error.message === "string" && !error.message.startsWith("HTTP Error")) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim().length > 0) return error;
  return fallback;
};

export const getFieldErrors = (error: unknown): Record<string, string> => {
  if (!isApiError(error)) return {};
  const detail = (error as ApiError).detail;
  if (!Array.isArray(detail)) return {};

  return detail.reduce<Record<string, string>>((acc, item) => {
    if (!item || typeof item !== "object") return acc;
    const entry = item as FastApiDetailItem;
    if (!entry.loc || !entry.msg) return acc;
    const path = entry.loc.filter((part) => typeof part === "string") as string[];
    const rawField = path[path.length - 1];
    if (!rawField || rawField === "body") return acc;
    const normalized = FIELD_NAME_MAP[rawField] ?? toCamelCase(rawField);
    acc[normalized] = entry.msg;
    return acc;
  }, {});
};
