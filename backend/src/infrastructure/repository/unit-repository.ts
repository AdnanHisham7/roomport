import { IUnit } from "../../domain/entities/Unit";
import { IUnitRepository } from "../../domain/repository/unit-repository.interface";
import { AgreementModel } from "../db/model/agreement-model";
import { UnitModel } from "../db/model/unit-model";

export class UnitRepository implements IUnitRepository {
  private toStringId(doc: { _id: unknown }): string {
    return (doc._id as { toString(): string }).toString();
  }

  private toEntity(doc: any): IUnit {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: this.toStringId(obj),
      buildingId: obj.buildingId?.toString(),
    };
  }

  async findById(id: string): Promise<IUnit | null> {
    const doc = await UnitModel.findById(id).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findAll(
    filter?: Partial<Pick<IUnit, "buildingId" | "status" | "isOccupied">>,
  ): Promise<IUnit[]> {
    const query: Record<string, any> = {};
    if (filter?.buildingId) query.buildingId = filter.buildingId;
    if (filter?.status) query.status = filter.status;
    if (filter?.isOccupied !== undefined) query.isOccupied = filter.isOccupied;

    const docs = await UnitModel.find(query)
      .sort({ floorNumber: 1, unitNumber: 1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findByBuildingId(buildingId: string): Promise<IUnit[]> {
    const docs = await UnitModel.find({ buildingId })
      .sort({ floorNumber: 1, unitNumber: 1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findByBuildingAndFloor(
    buildingId: string,
    floorNumber: string,
  ): Promise<IUnit[]> {
    const docs = await UnitModel.find({ buildingId, floorNumber })
      .sort({ unitNumber: 1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findByBuildingIds(buildingIds: string[]): Promise<IUnit[]> {
    if (buildingIds.length === 0) return [];
    const docs = await UnitModel.find({
      buildingId: { $in: buildingIds },
    }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async countByBuildingId(
    buildingId: string,
    filter?: Partial<Pick<IUnit, "status" | "isOccupied">>,
  ): Promise<number> {
    const query: Record<string, any> = { buildingId };
    if (filter?.status) query.status = filter.status;
    if (filter?.isOccupied !== undefined) query.isOccupied = filter.isOccupied;
    return UnitModel.countDocuments(query);
  }

  async create(
    data: Omit<IUnit, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IUnit> {
    const doc = await UnitModel.create(data);

    return this.toEntity(doc);
  }

  async update(id: string, data: Partial<IUnit>): Promise<IUnit | null> {
    const doc = await UnitModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async delete(id: string): Promise<boolean> {
    const result = await UnitModel.findByIdAndDelete(id);
    return !!result;
  }

  async deleteByBuildingAndFloor(
    buildingId: string,
    floorNumber: string,
    onlyAvailable: boolean,
  ): Promise<number> {
    const query: Record<string, any> = { buildingId, floorNumber };
    if (onlyAvailable) query.isOccupied = false;
    const result = await UnitModel.deleteMany(query);
    return result.deletedCount ?? 0;
  }

  async existsById(id: string): Promise<boolean> {
    return !!(await UnitModel.exists({ _id: id }));
  }
}
