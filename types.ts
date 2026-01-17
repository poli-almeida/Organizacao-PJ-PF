
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum TransactionNature {
  BUSINESS = 'BUSINESS',
  PERSONAL = 'PERSONAL',
  MIXED = 'MIXED'
}

export enum DebtType {
  CREDIT_CARD = 'CREDIT_CARD',
  LOAN = 'LOAN',
  RENEGOTIATION = 'RENEGOTIATION',
  FINANCING = 'FINANCING',
  OTHER = 'OTHER'
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  nature: TransactionNature;
}

export interface TaxPayment {
  id: string;
  date: string;
  taxName: string;
  amount: number;
  period: string;
}

export interface Debt {
  id: string;
  description: string;
  totalAmount: number;
  remainingAmount: number;
  installmentValue: number;
  debtType: DebtType;
  interestRate?: number; // % ao mês
  isHighRisk?: boolean;
  startDate: string;
}

export interface FixedCost {
  id: string;
  description: string;
  totalAmount: number;
  businessPercentage: number; 
  category: string;
  endDate?: string; // Data para finalizar o custo (opcional)
}

export interface Milestone {
  label: string;
  target: number;
  reward: string;
  icon: string;
}

export interface ProfitBucket {
  id: string;
  name: string;
  percentage: number;
  color: string;
  icon: string;
}

export interface FinancialStats {
  totalRevenue: number;
  totalBusinessCosts: number;
  totalPersonalCosts: number;
  taxProvision: number;
  realProfit: number;
  accountMixLeakage: number;
  goalProgress: number;
  personalLeakedInBusiness: number;
  totalTaxesPaid: number;
  proLabore: number;
  monthlyFixedCostsBusiness: number;
}
