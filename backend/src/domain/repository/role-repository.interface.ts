import type { IRole } from "../entities/Role";

export interface IRoleRepository {
  findByName(name: string): Promise<IRole | null>;
  findById(id: string): Promise<IRole | null>;
  create(data: Omit<IRole, "_id" | "createdAt" | "updatedAt">): Promise<IRole>;
  existsByName(name: string): Promise<boolean>;
  findAll(): Promise<IRole[]>;
}
