
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

export interface Debt {
  id: string;
  description: string;
  totalAmount: number;
  remainingAmount: number;
  installmentValue: number;
  installmentsTotal: number;
  installmentsPaid: number;
}

export interface Milestone {
  label: string;
  target: number;
  reward: string;
  icon: string;
}

export interface FinancialStats {
  totalRevenue: number;
  totalBusinessCosts: number;
  totalPersonalCosts: number;
  realProfit: number;
  accountMixLeakage: number; // % of personal expenses paid by "business"
  goalProgress: number;
}
