import {
  CreateFloorDTO,
  FloorResponseDTO,
  UpdateFloorDTO,
} from "../../dtos/floor/floor.dto";

export interface IFloorUseCases {
  create(
    data: CreateFloorDTO,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<FloorResponseDTO>;
  getByBuilding(buildingId: string): Promise<FloorResponseDTO[]>;
  getById(id: string): Promise<FloorResponseDTO>;
  update(
    id: string,
    data: UpdateFloorDTO,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<FloorResponseDTO>;
  delete(
    id: string,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<void>;
}
