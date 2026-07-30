export type BillingCycle = "monthly" | "yearly";

export interface Subscription {
  _id: string;
  userId: string;
  amount: number;
  numberOfBuildings: number;
  numberOfUnits: number;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  dueDate: string;
  paidAt?: string;
  status: string;
  paymentMethod?: string;
  invoicenumber?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionPeriod {
  _id: string;
  subscriptionId: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  paidAt?: string;
  notes?: string;
  createdAt?: string;
}

export interface DemoRequest {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  numberOfBuildings: number;
  numberOfUnits: number;
  message?: string;
  status: "new" | "contacted" | "converted" | "closed";
  adminNotes?: string;
  createdAt?: string;
}

export type InquiryStatus = "new" | "contacted" | "closed" | "spam";
export interface Inquiry {
  _id: string;
  buildingId: string;
  unitId?: string;
  ownerId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  status: InquiryStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformStats {
  totalBuilders: number;
  totalManagers: number;
  totalBuildings: number;
  publishedBuildings: number;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  occupancyRate: number;
  totalRevenue: number;
  activeSubscriptions: number;
  pendingSubscriptions: number;
  newBuildersLast30Days: number;
  totalInquiries: number;
  newInquiriesLast30Days: number;
}

export interface BuilderListItem {
  _id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  status: string;
  role: string;
  paymentStatus: boolean;
  email_verified: boolean;
  buildingsCount: number;
  unitsCount: number;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface BuilderDetail extends BuilderListItem {
  managers: {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
  }[];
  buildings: {
    _id: string;
    name: string;
    totalUnits: number;
    totalFloors: number;
    status: string;
    isPublished: boolean;
  }[];
  subscription: {
    _id: string;
    amount: number;
    numberOfBuildings: number;
    numberOfUnits: number;
    status: string;
    billingCycle: BillingCycle;
    dueDate: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    periods: SubscriptionPeriod[];
  } | null;
}

export interface PlatformSetting {
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
  updatedAt?: string;
}

import type { Unit } from "./building";

export interface PublicUnitOffer {
  _id: string;
  title: string;
  description?: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  endDate: string;
}

export interface PublicBuildingCard {
  _id: string;
  name: string;
  slug?: string;
  type: string;
  status: string;
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  totalUnits: number;
  totalFloors: number;
  sqft?: number;
  lift: boolean;
  helipad: boolean;
  amenities?: string[];
  images?: string[];
  description?: string;
  isFeatured: boolean;
  availableUnitsCount: number;
  occupiedUnitsCount: number;
  minRent: number | null;
  maxRent: number | null;
  createdAt?: string;
}

export interface PublicNearbyBuilding extends PublicBuildingCard {
  distanceKm: number;
}

export interface PublicBuildingDetail extends PublicBuildingCard {
  floors: {
    _id: string;
    floorNumber: number;
    name: string;
    totalUnits: number;
    status: string;
    availableUnitsCount: number;
    occupiedUnitsCount: number;
  }[];
}

export interface PublicUnit extends Unit {
  activeOffer?: PublicUnitOffer;
  effectiveRent: number;
}

export interface PublicUnitDetail extends PublicUnit {
  building: {
    _id: string;
    name: string;
    slug?: string;
    type: string;
    location: PublicBuildingCard["location"];
    amenities?: string[];
    images?: string[];
  };
}

export interface PublicFilters {
  cities: string[];
  types: string[];
}

export type PaymentRecordStatus = "pending" | "paid" | "overdue" | "waived";
export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "upi"
  | "cheque"
  | "card"
  | "other";

export interface PaymentRecord {
  _id: string;
  tenantId: string;
  buildingId: string;
  unitId?: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: PaymentRecordStatus;
  paidAt?: string;
  method?: PaymentMethod;
  notes?: string;
  receiptUrl?: string;
  recordedBy: string;
  createdAt?: string;
  updatedAt?: string;
}
