import type { IFloor } from "../../domain/entities/Floor";
import type { IFloorRepository } from "../../domain/repository/floor-repository.interface";
import { FloorModel } from "../db/model/floor-model";

export class FloorRepository implements IFloorRepository {
  private toStringId(doc: { _id: unknown }): string {
    return (doc._id as { toString(): string }).toString();
  }

  private toEntity(doc: any): IFloor {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: this.toStringId(obj),
      buildingId: obj.buildingId?.toString() ?? "",
    };
  }

  async findById(id: string): Promise<IFloor | null> {
    const doc = await FloorModel.findById(id).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findByBuildingId(buildingId: string): Promise<IFloor[]> {
    const docs = await FloorModel.find({ buildingId })
      .sort({ floorNumber: 1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findAll(
    filter?: Partial<Pick<IFloor, "buildingId" | "status">>,
  ): Promise<IFloor[]> {
    const query: Record<string, any> = {};
    if (filter?.buildingId) query.buildingId = filter.buildingId;
    if (filter?.status) query.status = filter.status;

    const docs = await FloorModel.find(query).sort({ floorNumber: 1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async create(
    data: Omit<IFloor, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IFloor> {
    const doc = await FloorModel.create(data);
    return this.toEntity(doc);
  }

  async update(id: string, data: Partial<IFloor>): Promise<IFloor | null> {
    const doc = await FloorModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async delete(id: string): Promise<boolean> {
    const result = await FloorModel.findByIdAndDelete(id);
    return !!result;
  }

  async existsById(id: string): Promise<boolean> {
    return !!(await FloorModel.exists({ _id: id }));
  }

  async existsByBuildingAndFloorNumber(
    buildingId: string,
    floorNumber: number,
  ): Promise<boolean> {
    return !!(await FloorModel.exists({ buildingId, floorNumber }));
  }

  async findByBuildingAndFloorNumber(
    buildingId: string,
    floorNumber: number,
  ): Promise<IFloor | null> {
    const doc = await FloorModel.findOne({ buildingId, floorNumber }).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }
}
