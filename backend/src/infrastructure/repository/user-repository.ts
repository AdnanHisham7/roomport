import type { IUser } from "../../domain/entities/User";
import type {
  IUserRepository,
  UserListFilter,
} from "../../domain/repository/user-repository.interface";
import { UserModel } from "../db/model/user-model";

export class UserRepository implements IUserRepository {
  private toStringId(doc: { _id: unknown }): string {
    return (doc._id as { toString(): string }).toString();
  }

  private toEntity(doc: any): IUser {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: this.toStringId(obj),
      building_id: obj.building_id?.toString() ?? undefined,
      ownerId: obj.ownerId?.toString() ?? undefined,
      subscriptionId: obj.subscriptionId?.toString() ?? undefined,
    };
  }

  private buildQuery(filter?: UserListFilter): Record<string, any> {
    const query: Record<string, any> = {};
    if (!filter) return query;
    if (filter.role) query.role = filter.role;
    if (filter.status) query.status = filter.status;
    if (filter.ownerId) query.ownerId = filter.ownerId;
    if (filter.search) {
      const re = new RegExp(filter.search.trim(), "i");
      query.$or = [{ email: re }, { first_name: re }, { last_name: re }];
    }
    return query;
  }

  // ── findByEmail ──────────────────────────────────────────────────────────
  async findByEmail(email: string): Promise<IUser | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  // ── findById ─────────────────────────────────────────────────────────────
  async findById(id: string): Promise<IUser | null> {
    const doc = await UserModel.findById(id).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  // ── findAll ──────────────────────────────────────────────────────────────
  async findAll(): Promise<IUser[]> {
    const docs = await UserModel.find().lean();
    return docs.map((d) => this.toEntity(d));
  }

  // ── findAllPaginated ─────────────────────────────────────────────────────
  async findAllPaginated(
    filter: UserListFilter,
    skip: number,
    limit: number,
  ): Promise<{ data: IUser[]; total: number }> {
    const query = this.buildQuery(filter);
    const [docs, total] = await Promise.all([
      UserModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(query),
    ]);
    return { data: docs.map((d) => this.toEntity(d)), total };
  }

  // ── countAll ─────────────────────────────────────────────────────────────
  async countAll(filter?: UserListFilter): Promise<number> {
    return UserModel.countDocuments(this.buildQuery(filter));
  }

  // ── findByOwnerId ────────────────────────────────────────────────────────
  async findByOwnerId(ownerId: string): Promise<IUser[]> {
    const docs = await UserModel.find({ ownerId }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  // ── create ───────────────────────────────────────────────────────────────
  async create(
    data: Omit<IUser, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IUser> {
    const doc = await UserModel.create(data);
    return this.toEntity(doc);
  }

  // ── updateStatus ─────────────────────────────────────────────────────────
  async updateStatus(userId: string, status: IUser["status"]): Promise<void> {
    await UserModel.updateOne({ _id: userId }, { $set: { status } });
  }

  // ── updateEmailVerified ───────────────────────────────────────────────────
  async updateEmailVerified(userId: string): Promise<void> {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { email_verified: true, status: "active" } },
    );
  }

  // ── updatePassword ────────────────────────────────────────────────────────
  async updatePassword(email: string, hashedPassword: string): Promise<void> {
    await UserModel.updateOne(
      { email: email.toLowerCase() },
      { $set: { password: hashedPassword } },
    );
  }

  // ── updateRefreshToken ────────────────────────────────────────────────────
  async updateRefreshToken(
    userId: string,
    hashedToken: string | null,
  ): Promise<void> {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { refresh_token: hashedToken } },
    );
  }

  // ── updateLastLogin ───────────────────────────────────────────────────────
  async updateLastLogin(userId: string): Promise<void> {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { lastLoginAt: new Date() } },
    );
  }

  // ── update ────────────────────────────────────────────────────────────────
  async update(userId: string, data: Partial<IUser>): Promise<IUser | null> {
    const doc = await UserModel.findByIdAndUpdate(
      userId,
      { $set: data },
      { new: true },
    ).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  // ── delete ────────────────────────────────────────────────────────────────
  async delete(userId: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(userId);
    return !!result;
  }
}
