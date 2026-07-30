import type { IRole } from "../../domain/entities/Role";
import type { IRoleRepository } from "../../domain/repository/role-repository.interface";
import { RoleModel } from "../db/model/role-model";

export class RoleRepository implements IRoleRepository {
  private toStringId(doc: { _id: unknown }): string {
    return (doc._id as { toString(): string }).toString();
  }

  async findByName(name: string): Promise<IRole | null> {
    const doc = await RoleModel.findOne({ name }).lean();
    if (!doc) return null;
    return { ...doc, _id: this.toStringId(doc) };
  }

  async findById(id: string): Promise<IRole | null> {
    const doc = await RoleModel.findById(id).lean();
    if (!doc) return null;
    return { ...doc, _id: this.toStringId(doc) };
  }

  async create(
    data: Omit<IRole, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IRole> {
    const doc = await RoleModel.create(data);
    return { ...doc.toObject(), _id: this.toStringId(doc) };
  }

  async existsByName(name: string): Promise<boolean> {
    return !!(await RoleModel.exists({ name }));
  }

  async findAll(): Promise<IRole[]> {
    const docs = await RoleModel.find().lean();
    return docs.map((d) => ({ ...d, _id: this.toStringId(d) }));
  }
}
