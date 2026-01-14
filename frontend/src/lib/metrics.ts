import * as Sentry from "@sentry/react";

export type KeyFlowName =
  | "login"
  | "event.create"
  | "vote.submit"
  | "schedule.confirm";

export type KeyFlowResult = "success" | "failure";

type MetricAttributes = Record<string, string | number | boolean>;

export const trackKeyFlowCounter = (
  flow: KeyFlowName,
  result: KeyFlowResult,
  attributes?: MetricAttributes
) => {
  if (!Sentry.metrics?.count) return;

  const metricName = `eventhorizon.frontend.${flow}.${result}`;
  Sentry.metrics.count(metricName, 1, {
    attributes,
  });
};

export const trackFavoriteToggle = (
  isFavorite: boolean,
  attributes?: MetricAttributes
) => {
  if (!Sentry.metrics?.count) return;

  const action = isFavorite ? "add" : "remove";
  const metricName = `eventhorizon.frontend.favorite.${action}`;
  Sentry.metrics.count(metricName, 1, {
    attributes,
  });
};

export const trackAiAnalysisDuration = (
  durationMs: number,
  attributes?: MetricAttributes
) => {
  if (!Sentry.metrics?.distribution) return;

  Sentry.metrics.distribution(
    "eventhorizon.frontend.ai.analysis.duration_ms",
    durationMs,
    {
      unit: "millisecond",
      attributes,
    }
  );
};
