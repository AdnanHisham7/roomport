export interface IBuilderPayout {
  _id?: string;
  builderId: string;
  amount: number;
  markedBy: string;
  note?: string;
  createdAt?: Date;
}
