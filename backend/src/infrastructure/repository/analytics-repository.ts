import mongoose from "mongoose";
import { IAnalyticsRepository } from "../../domain/repository/analytics-repository.interface";
import {
  DashboardMetricsDTO,
  AnalyticsTrendsDTO,
} from "../../application/dtos/analytics/analytics.dto";
import { AgreementModel } from "../db/model/agreement-model";
import { PaymentRecordModel } from "../db/model/payment-record-model";
import { TenantModel } from "../db/model/tenant-model";
import { UnitModel } from "../db/model/unit-model";
import { BuildingModel } from "../db/model/building-model";
import { BookingModel } from "../db/model/booking-model";
import { InquiryModel } from "../db/model/inquiry-model";

export class AnalyticsRepository implements IAnalyticsRepository {
  async getDashboardMetrics(userId: string): Promise<DashboardMetricsDTO> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    // Cast to any to resolve Mongoose schema-field string vs ObjectId type conflicts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyFilter = (f: object) => f as any;

    const buildings = await BuildingModel.find(
      anyFilter({ ownerId: userObjectId }),
    ).lean();
    const buildingOids = buildings.map((b) => b._id);
    const buildingIdStrs = buildings.map((b) => b._id.toString());
    const buildingNameMap = new Map(
      buildings.map((b) => [b._id.toString(), b.name]),
    );

    // Aggregations use ObjectIds (correct for Mongoose aggregate which bypasses the schema type layer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agg = async (model: any, pipeline: object[]): Promise<any[]> =>
      model.aggregate(anyFilter(pipeline));

    const [revenueAgg] = await agg(PaymentRecordModel, [
      { $match: { buildingId: { $in: buildingOids }, status: "paid" } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]);
    const [pendingAgg] = await agg(PaymentRecordModel, [
      {
        $match: {
          buildingId: { $in: buildingOids },
          status: { $in: ["pending", "overdue"] },
        },
      },
      { $group: { _id: null, pendingRevenue: { $sum: "$amount" } } },
    ]);
    const revenueByBuildingAgg = await agg(PaymentRecordModel, [
      { $match: { buildingId: { $in: buildingOids }, status: "paid" } },
      { $group: { _id: "$buildingId", revenue: { $sum: "$amount" } } },
      { $project: { _id: 0, buildingId: "$_id", revenue: 1 } },
    ]);

    // Regular finds use string IDs to match schema typing
    const allUnits = await UnitModel.find(
      anyFilter({ buildingId: { $in: buildingIdStrs } }),
    ).lean();
    const totalUnits = allUnits.length;
    const occupiedUnits = allUnits.filter(
      (u) => u.isOccupied || u.status === "occupied",
    ).length;
    const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
    const ratePercentage =
      totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const recentlyRentedUnits = await AgreementModel.find(
      anyFilter({
        createdBy: userObjectId,
        status: "completed",
        startDate: { $gte: thirtyDaysAgo },
      }),
    )
      .select("unitId buildingId monthlyRent startDate")
      .lean();

    const expiringAgreements = await AgreementModel.find(
      anyFilter({
        createdBy: userObjectId,
        status: "completed",
        endDate: { $gte: new Date(), $lte: sixtyDaysFromNow },
      }),
    )
      .select("_id unitId tenantId endDate monthlyRent")
      .lean();

    const pendingPayments = await PaymentRecordModel.find(
      anyFilter({
        buildingId: { $in: buildingIdStrs },
        status: { $in: ["pending", "overdue"] },
      }),
    )
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const recentTxns = await PaymentRecordModel.find(
      anyFilter({
        buildingId: { $in: buildingIdStrs },
        status: "paid",
      }),
    )
      .sort({ paidAt: -1 })
      .limit(50)
      .lean();

    const allUnitIds = [
      ...new Set([
        ...pendingPayments.map((p) => p.unitId?.toString()).filter(Boolean),
        ...recentTxns.map((t) => t.unitId?.toString()).filter(Boolean),
      ]),
    ];
    const units = await UnitModel.find(
      anyFilter({ _id: { $in: allUnitIds } }),
    ).lean();
    const unitMap = new Map(units.map((u) => [u._id.toString(), u.unitNumber]));

    const tenantIds = [
      ...new Set(
        pendingPayments.map((p) => p.tenantId?.toString()).filter(Boolean),
      ),
    ];
    const tenants = await TenantModel.find(
      anyFilter({ _id: { $in: tenantIds } }),
    ).lean();
    const tenantMap = new Map(
      tenants.map((t) => [t._id.toString(), `${t.firstName} ${t.lastName}`]),
    );

    const txnTenantIds = [
      ...new Set(recentTxns.map((t) => t.tenantId?.toString()).filter(Boolean)),
    ];
    const txnTenants = await TenantModel.find(
      anyFilter({ _id: { $in: txnTenantIds } }),
    ).lean();
    const txnTenantMap = new Map(
      txnTenants.map((t) => [t._id.toString(), `${t.firstName} ${t.lastName}`]),
    );

    return {
      totalRevenue: revenueAgg?.totalRevenue ?? 0,
      pendingRevenue: pendingAgg?.pendingRevenue ?? 0,
      occupancyRate: { totalUnits, occupiedUnits, vacantUnits, ratePercentage },
      revenueByBuilding: revenueByBuildingAgg,
      recentlyRentedUnits: recentlyRentedUnits.map((a) => ({
        unitId: a.unitId?.toString() ?? "",
        buildingId: a.buildingId?.toString() ?? "",
        rentAmount: a.monthlyRent,
        startDate: a.startDate,
      })),
      expiringAgreements: expiringAgreements.map((a) => ({
        agreementId: a._id.toString(),
        unitId: a.unitId?.toString() ?? "",
        tenantId: a.tenantId?.toString() ?? "",
        endDate: a.endDate,
        monthlyRent: a.monthlyRent,
      })),
      pendingPayments: pendingPayments.map((p) => ({
        tenantId: p.tenantId?.toString() ?? "",
        tenantName: tenantMap.get(p.tenantId?.toString() ?? "") ?? "Unknown",
        unitId: p.unitId?.toString(),
        amount: p.amount,
        periodLabel: p.periodLabel,
      })),
      recentTransactions: recentTxns.map((t) => ({
        _id: t._id.toString(),
        tenantId: t.tenantId?.toString() ?? "",
        tenantName: txnTenantMap.get(t.tenantId?.toString() ?? "") ?? "Unknown",
        buildingId: t.buildingId?.toString() ?? "",
        buildingName: buildingNameMap.get(t.buildingId?.toString() ?? ""),
        unitId: t.unitId?.toString(),
        unitNumber: unitMap.get(t.unitId?.toString() ?? ""),
        periodLabel: t.periodLabel,
        periodStart: t.periodStart,
        periodEnd: t.periodEnd,
        amount: t.amount,
        status: t.status,
        paidAt: t.paidAt,
        method: t.method,
        notes: t.notes,
        createdAt: t.createdAt,
      })),
    };
  }

  async getRoomTrends(userId: string): Promise<AnalyticsTrendsDTO> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const anyFilter = (f: object) => f as any;
    const agg = async (model: any, pipeline: object[]): Promise<any[]> =>
      model.aggregate(anyFilter(pipeline));

    const buildings = await BuildingModel.find(
      anyFilter({ ownerId: userObjectId }),
    ).lean();
    const buildingOids = buildings.map((b) => b._id);
    const buildingIdStrs = buildings.map((b) => b._id.toString());
    const buildingNameMap = new Map(
      buildings.map((b) => [b._id.toString(), b.name]),
    );

    // ── Monthly trend (last 6 months, zero-filled) ──────────────────────────
    const now = new Date();
    const months: { key: string; label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );
      months.push({
        key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
        label: start.toLocaleString("default", {
          month: "short",
          year: "numeric",
        }),
        start,
        end,
      });
    }
    const rangeStart = months[0].start;

    const revenueAgg = await agg(PaymentRecordModel, [
      {
        $match: {
          buildingId: { $in: buildingOids },
          status: "paid",
          paidAt: { $gte: rangeStart },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } },
          revenue: { $sum: "$amount" },
        },
      },
    ]);
    const revenueByMonth = new Map(revenueAgg.map((r) => [r._id, r.revenue]));

    const bookingAgg = await agg(BookingModel, [
      {
        $match: {
          buildingId: { $in: buildingOids },
          createdAt: { $gte: rangeStart },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          bookingsCreated: { $sum: 1 },
          bookingsConfirmed: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
        },
      },
    ]);
    const bookingsByMonth = new Map(bookingAgg.map((b) => [b._id, b]));

    const monthlyTrend = months.map((m) => ({
      month: m.key,
      label: m.label,
      revenue: revenueByMonth.get(m.key) ?? 0,
      bookingsCreated: bookingsByMonth.get(m.key)?.bookingsCreated ?? 0,
      bookingsConfirmed: bookingsByMonth.get(m.key)?.bookingsConfirmed ?? 0,
    }));

    // ── Room type demand (grouped by bedroom count) ─────────────────────────
    const allUnits = await UnitModel.find(
      anyFilter({ buildingId: { $in: buildingIdStrs } }),
    ).lean();
    const bedroomsByUnitId = new Map(
      allUnits.map((u) => [u._id.toString(), u.bedrooms]),
    );

    const [bookingsForBuildings, inquiriesForBuildings] = await Promise.all([
      BookingModel.find(anyFilter({ buildingId: { $in: buildingOids } }))
        .select("unitId")
        .lean(),
      InquiryModel.find(anyFilter({ buildingId: { $in: buildingOids } }))
        .select("unitId")
        .lean(),
    ]);

    const demandMap = new Map<
      number,
      {
        bedrooms: number;
        totalUnits: number;
        occupiedUnits: number;
        totalBookings: number;
        totalInquiries: number;
      }
    >();
    for (const u of allUnits) {
      const entry = demandMap.get(u.bedrooms) ?? {
        bedrooms: u.bedrooms,
        totalUnits: 0,
        occupiedUnits: 0,
        totalBookings: 0,
        totalInquiries: 0,
      };
      entry.totalUnits += 1;
      if (u.isOccupied || u.status === "occupied") entry.occupiedUnits += 1;
      demandMap.set(u.bedrooms, entry);
    }
    for (const b of bookingsForBuildings) {
      const bedrooms = bedroomsByUnitId.get(b.unitId?.toString() ?? "");
      if (bedrooms === undefined) continue;
      const entry = demandMap.get(bedrooms);
      if (entry) entry.totalBookings += 1;
    }
    for (const i of inquiriesForBuildings) {
      const bedrooms = bedroomsByUnitId.get(i.unitId?.toString() ?? "");
      if (bedrooms === undefined) continue;
      const entry = demandMap.get(bedrooms);
      if (entry) entry.totalInquiries += 1;
    }

    const roomTypeDemand = [...demandMap.values()]
      .sort((a, b) => a.bedrooms - b.bedrooms)
      .map((d) => ({
        ...d,
        occupancyRatePercentage:
          d.totalUnits > 0
            ? Math.round((d.occupiedUnits / d.totalUnits) * 100)
            : 0,
      }));

    // ── Top units by revenue ────────────────────────────────────────────────
    const topUnitsAgg = await agg(PaymentRecordModel, [
      { $match: { buildingId: { $in: buildingOids }, status: "paid" } },
      { $group: { _id: "$unitId", totalRevenue: { $sum: "$amount" } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
    ]);
    const unitMap = new Map(allUnits.map((u) => [u._id.toString(), u]));
    const topUnitsByRevenue = topUnitsAgg
      .filter((t) => t._id)
      .map((t) => {
        const unit = unitMap.get(t._id.toString());
        return {
          unitId: t._id.toString(),
          unitNumber: unit?.unitNumber ?? "Unknown",
          buildingId: unit?.buildingId?.toString() ?? "",
          buildingName: buildingNameMap.get(unit?.buildingId?.toString() ?? ""),
          totalRevenue: t.totalRevenue,
        };
      });

    return { monthlyTrend, roomTypeDemand, topUnitsByRevenue };
  }
}
