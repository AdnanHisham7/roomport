import { BuildingResponseDTO } from "../../dtos/building/building.dto";
import {
  BuilderDetailDTO,
  BuilderListItemDTO,
  PaginatedResult,
  PlatformStatsDTO,
} from "../../dtos/super-admin/super-admin.dto";
import { IPlatformSetting } from "../../../domain/entities/PlatformSetting";
import { IActivityLog } from "../../../domain/entities/ActivityLog";
import {
  AdminUpdateSubscriptionDTO,
  SubscriptionResponseDTO,
} from "../../dtos/subscription/subscription.dto";

export interface ISuperAdminUseCases {
  getPlatformStats(): Promise<PlatformStatsDTO>;
  listBuilders(
    filter: { search?: string; status?: string; role?: string },
    page: number,
    limit: number,
  ): Promise<PaginatedResult<BuilderListItemDTO>>;
  getBuilderDetail(id: string): Promise<BuilderDetailDTO>;
  updateBuilderStatus(
    id: string,
    status: "active" | "inactive" | "suspended",
  ): Promise<void>;
  deleteBuilder(id: string): Promise<void>;
  listBuildings(
    filter: {
      search?: string;
      status?: string;
      isPublished?: boolean;
      isFeatured?: boolean;
    },
    page: number,
    limit: number,
  ): Promise<PaginatedResult<BuildingResponseDTO & { ownerName?: string }>>;
  toggleFeatureBuilding(
    id: string,
    isFeatured: boolean,
  ): Promise<BuildingResponseDTO>;
  togglePublishBuilding(
    id: string,
    isPublished: boolean,
  ): Promise<BuildingResponseDTO>;
  deleteBuildingAsAdmin(id: string): Promise<void>;
  listActivityLogs(
    filter: Record<string, any>,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<IActivityLog>>;
  getSettings(): Promise<IPlatformSetting>;
  updateSettings(
    data: Partial<IPlatformSetting>,
    updatedBy: string,
  ): Promise<IPlatformSetting>;
  listSubscriptions(
    filter: { userId?: string; status?: string },
    page: number,
    limit: number,
  ): Promise<PaginatedResult<SubscriptionResponseDTO & { ownerName?: string }>>;
  updateSubscription(
    id: string,
    data: AdminUpdateSubscriptionDTO,
    adminUserId: string,
  ): Promise<SubscriptionResponseDTO>;
}
