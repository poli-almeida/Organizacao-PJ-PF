
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
  taxName: string; // DAS, ISS, IRPJ, etc.
  amount: number;
  period: string; // Mês/Ano de competência
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

export interface ProfitBucket {
  id: string;
  name: string;
  percentage: number; // 0 to 1
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
}
