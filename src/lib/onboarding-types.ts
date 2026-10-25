export type BusinessEntityType =
  | "pvt_ltd"
  | "public_ltd"
  | "opc"
  | "llp"
  | "partnership"
  | "sole_proprietorship"
  | "other";

export interface BankAccountItem {
  id: string;
  bankName: string;
  accountNickname: string;
  accountType: "current" | "savings" | "od_cc";
  accountNumberMasked?: string;
  currentBalance: number;
  restrictedAmount: number; // e.g. margin money, bank guarantees
  availableBalance: number; // currentBalance - restrictedAmount
  lastUpdatedDate: string;
}

export interface OpeningReceivableItem {
  id: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: number;
  amountReceived: number;
  expectedCollectionDate: string;
  outstandingBalance: number; // invoiceAmount - amountReceived
  notes?: string;
}

export interface OpeningPayableItem {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number; // totalAmount - paidAmount
  category: string;
}

export interface InventoryItem {
  id: string;
  itemName: string;
  quantity?: number;
  unit?: string;
  estimatedValue: number;
  valuationDate: string;
}

export interface FixedAssetItem {
  id: string;
  assetName: string;
  category: "machinery" | "vehicles" | "it_hardware" | "furniture_fixtures" | "real_estate" | "other";
  purchaseCost: number;
  currentEstimatedValue: number;
}

export interface SupplierAdvanceItem {
  id: string;
  supplierName: string;
  advanceAmount: number;
  purpose: string;
}

export interface LiabilityItem {
  id: string;
  liabilityType: "loan" | "tax_payable" | "payroll_obligation" | "other";
  name: string;
  amount: number;
  dueDate?: string;
}

export interface OnboardingProfile {
  mcaLegalName: string;
  tradeName: string;
  cin?: string;
  entityType: BusinessEntityType;
  incorporationDate?: string;
  registeredAddress: string;
  operatingAddress: string;
  sameAsRegistered: boolean;
  city: string;
  state: string;
  industry: string;
  businessDescription: string;
  financialYear: string;
  gstin?: string;
  udyamNumber?: string;
}

export interface OnboardingCompanyVerification {
  verificationSource: "mca_lookup" | "format_validated" | "manual_user_declared";
  isFormatValid: boolean;
  verifiedStatus: "verified" | "unverified" | "manual_confirmation";
  verifiedAt?: string;
  userConfirmed: boolean;
  mcaDetailsRetrieved?: {
    cin: string;
    companyName: string;
    rocCode: string;
    registrationNumber: string;
    companyCategory: string;
    companySubCategory: string;
    classOfCompany: string;
    authorizedCapital?: number;
    paidUpCapital?: number;
    dateOfIncorporation: string;
    registeredAddress: string;
  };
}

export interface OnboardingOpeningFinances {
  cashInHand: number;
  bankAccounts: BankAccountItem[];
  reservedCash: number;
  minimumReserve: number;
  otherLiquidFunds: number;
  shortTermInvestments: number;
  isShortTermInvestmentImmediatelyAvailable?: boolean;
  shortTermInvestmentDescription?: string;
  receivables: OpeningReceivableItem[];
  supplierAdvances: SupplierAdvanceItem[];
  inventoryItems: InventoryItem[];
  fixedAssets: FixedAssetItem[];
  otherCurrentAssets: number;
  payables: OpeningPayableItem[];
  loans: LiabilityItem[];
  taxesPayable: LiabilityItem[];
  payrollObligations: LiabilityItem[];
  otherLiabilities: LiabilityItem[];
}

export interface ForecastAssumptions {
  typicalMonthlySales?: number;
  typicalMonthlyExpenses?: number;
  expectedGrowthRate?: number; // e.g. 5 for 5%
  typicalCustomerPaymentDelay?: number; // in days
  supplierPaymentTerms?: number; // in days
  payrollScheduleDay?: number; // day of month e.g. 5
  payrollMonthlyAmount?: number;
  recurringIncome?: Array<{
    id: string;
    description: string;
    amount: number;
    frequency: "monthly" | "weekly";
    dayOfMonth?: number;
  }>;
  recurringExpenses?: Array<{
    id: string;
    description: string;
    amount: number;
    frequency: "monthly" | "weekly";
    dayOfMonth?: number;
  }>;
  loanRepaymentSchedules?: Array<{
    id: string;
    loanName: string;
    monthlyEMI: number;
    repaymentDayOfMonth: number;
  }>;
}

export interface OnboardingPreferences {
  defaultForecastHorizon: 7 | 30 | 60 | 90;
  safetyReserveBuffer: number;
  overdueAlertDays: number;
}

export interface OnboardingData {
  currentStep: number; // 1 to 5
  isCompleted: boolean;
  completedAt?: string;
  profile: OnboardingProfile;
  verification: OnboardingCompanyVerification;
  openingFinances: OnboardingOpeningFinances;
  preferences: OnboardingPreferences;
  forecastAssumptions?: ForecastAssumptions;
}
