import {
  DashboardMetricsDTO,
  AnalyticsTrendsDTO,
} from "../../application/dtos/analytics/analytics.dto";

export interface IAnalyticsRepository {
  getDashboardMetrics(userId: string): Promise<DashboardMetricsDTO>;
  getRoomTrends(userId: string): Promise<AnalyticsTrendsDTO>;
}
