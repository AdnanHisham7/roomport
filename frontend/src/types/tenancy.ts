export type TenantStatus = 'active' | 'inactive' | 'blacklisted' | 'pending';
export type RentType = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Tenant {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: TenantStatus;
  unitId?: string;
  buildingId?: string;
  job?: string;
  notes?: string;
  emergencyContact?: EmergencyContact;
  rentType: RentType;
  rentAmount: number;
  dueDate: number;
  moveInDate?: string;
  vacateDate?: string;
  paidAt?: string;
  terms?: string;
  portalEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AgreementStatus = 'draft' | 'sent' | 'viewed' | 'otp_sent' | 'verified' | 'completed' | 'expired' | 'cancelled';

export interface AgreementAudit {
  sentAt?: string;
  viewedAt?: string;
  signedAt?: string;
  verifiedAt?: string;
  completedAt?: string;
}

export interface Agreement {
  _id: string;
  tenantId: string;
  buildingId: string;
  unitId?: string;
  createdBy: string;
  title: string;
  body: string;
  terms?: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  status: AgreementStatus;
  typedSignatureName?: string;
  audit: AgreementAudit;
  finalPdfUrl?: string;
  documentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DocumentType =
  | 'rental_agreement' | 'building_license' | 'insurance' | 'lease_document'
  | 'tenant_id' | 'maintenance_invoice' | 'police_verification' | 'noc' | 'tax_document' | 'other';

export interface RentalDocument {
  _id: string;
  unitId?: string;
  buildingId?: string;
  tenantId?: string;
  leaseId?: string;
  type: DocumentType;
  title: string;
  description?: string;
  fileSize?: number;
  fileUrl: string;
  expiryDate?: string;
  uploadedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ExpenseCategory = 'repair' | 'utility' | 'salary' | 'tax' | 'renovation' | 'cleaning' | 'insurance' | 'security' | 'commission' | 'legal' | 'marketing' | 'other';
export type ExpenseStatus = 'pending' | 'paid' | 'cancelled';
export type ExpenseMethod = 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'card';

export interface Expense {
  _id: string;
  buildingId: string;
  unitId?: string;
  category: ExpenseCategory;
  title: string;
  description?: string;
  amount: number;
  date: string;
  status: ExpenseStatus;
  method: ExpenseMethod;
  paidTo?: string;
  receiptUrl?: string;
  invoiceNumber?: string;
  recordedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseTrackerSummary {
  period: string;
  totalIncome: number;
  incomeByType: { rent: number; securityDeposit: number; utility: number; other: number };
  totalExpenses: number;
  expenseByCategory: { category: ExpenseCategory; total: number }[];
  netProfit: number;
  profitMargin: number;
  pendingIncome: number;
  pendingExpenses: number;
  chart: { label: string; income: number; expenses: number; profit: number }[];
}
