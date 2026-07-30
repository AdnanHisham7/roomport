export interface IPlatformSetting {
  _id?: string;
  platformName: string;
  supportEmail?: string;
  pricePerBuilding: number;
  pricePerUnit: number;
  monthlyPricePerBuilding: number;
  monthlyPricePerUnit: number;
  yearlyPricePerBuilding: number;
  yearlyPricePerUnit: number;
  currency: string;
  maintenanceMode: boolean;
  maxFeaturedBuildings: number;
  commissionRatePercentage: number;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
