import {
  CreateUnitDTO,
  UnitResponseDTO,
  UpdateUnitDTO,
} from "../../dtos/unit/unit.dto";

export interface CreateUnitOptions {
  skipCountSync?: boolean; // true when caller (floor batch-create) already syncs floor/building counts itself
  skipFloorExistsCheck?: boolean;
}

export interface IUnitUseCases {
  create(
    data: CreateUnitDTO,
    options?: CreateUnitOptions,
  ): Promise<UnitResponseDTO>;
  getAll(filter?: {
    buildingId?: string;
    status?: string;
    isOccupied?: boolean;
  }): Promise<UnitResponseDTO[]>;
  getById(id: string): Promise<UnitResponseDTO>;
  update(
    id: string,
    data: UpdateUnitDTO,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<UnitResponseDTO>;
  bulkUpdate(
    unitIds: string[],
    data: UpdateUnitDTO,
  ): Promise<UnitResponseDTO[]>;
  delete(
    id: string,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<void>;
}
