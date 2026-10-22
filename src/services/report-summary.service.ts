import { apiRequest } from './api';

export type ReportSummaryHours = 24 | 168;

export interface ReportDistributionRow {
  key: string;
  label: string;
  count: number;
  percent: number;
}

export interface ReportSummary {
  generated_at: string;
  hours: ReportSummaryHours;
  herd: {
    total: number;
    active: number;
    gender: ReportDistributionRow[];
    health: ReportDistributionRow[];
  };
  security: {
    total: number;
    reviewed: number;
    unreviewed: number;
    confirmed: number;
    dismissed: number;
    average_confidence: number | null;
  };
}

export const reportSummaryService = {
  get: (hours: ReportSummaryHours, signal?: AbortSignal) =>
    apiRequest<ReportSummary>(
      `/api/mobile/report-summary/?hours=${hours}`,
      signal ? { signal } : {},
    ),
};