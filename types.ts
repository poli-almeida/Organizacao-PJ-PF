
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum TransactionNature {
  BUSINESS = 'BUSINESS',
  PERSONAL = 'PERSONAL',
  MIXED = 'MIXED'
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
  installmentsTotal: number;
  installmentsPaid: number;
}

export interface FixedCost {
  id: string;
  description: string;
  totalAmount: number;
  businessPercentage: number; // Ex: 0.20 para 20%
  category: string;
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
