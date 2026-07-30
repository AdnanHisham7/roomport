import { IBuildingRepository } from "../../../domain/repository/building-repository.interface";
import { ForbiddenError } from "../../../shared/error/app-error";
import { IBuildingAccessUseCase } from "../../interface/building/building-access-usecase.interface";

export class BuildingAccessUseCase implements IBuildingAccessUseCase {
  constructor(private readonly buildingRepo: IBuildingRepository) {}

  async assertOwnership(
    buildingId: string | undefined,
    userId: string,
    role: string,
  ): Promise<void> {
    if (role === "super_admin" || !buildingId) return;

    const building = await this.buildingRepo.findById(buildingId);
    if (!building) {
      throw new ForbiddenError(
        "Building not found or access denied.",
        "Provide a valid buildingId you own or manage.",
      );
    }
    if (building.ownerId !== userId && building.managerId !== userId) {
      throw new ForbiddenError(
        "You do not have access to this building.",
        "This building belongs to a different builder.",
      );
    }
  }

  async getAccessibleBuildingIds(userId: string): Promise<string[]> {
    const [owned, managed] = await Promise.all([
      this.buildingRepo.findAll({ ownerId: userId }),
      this.buildingRepo.findAll({ managerId: userId }),
    ]);
    return [...new Set([...owned, ...managed].map((b) => b._id!))];
  }
}
