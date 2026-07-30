import { IUnit } from "../entities/Unit";

export interface IUnitRepository {
  findById(id: string): Promise<IUnit | null>;
  findAll(
    filter?: Partial<Pick<IUnit, "buildingId" | "status" | "isOccupied">>,
  ): Promise<IUnit[]>;
  findByBuildingId(buildingId: string): Promise<IUnit[]>;
  findByBuildingAndFloor(
    buildingId: string,
    floorNumber: string,
  ): Promise<IUnit[]>;
  findByBuildingIds(buildingIds: string[]): Promise<IUnit[]>;
  countByBuildingId(
    buildingId: string,
    filter?: Partial<Pick<IUnit, "status" | "isOccupied">>,
  ): Promise<number>;
  create(data: Omit<IUnit, "_id" | "createdAt" | "updatedAt">): Promise<IUnit>;
  update(id: string, data: Partial<IUnit>): Promise<IUnit | null>;
  delete(id: string): Promise<boolean>;
  deleteByBuildingAndFloor(
    buildingId: string,
    floorNumber: string,
    onlyAvailable: boolean,
  ): Promise<number>;
  existsById(id: string): Promise<boolean>;
}
