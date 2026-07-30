export interface IReservedTenant {
  _id?: string;
  buildingId: string;
  unitId: string;
  bookingId: string;
  ownerId: string;
  name: string;
  email: string;
  phone?: string;
  amount: number;
  isPaid: boolean;
  reservedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
