
import { Milestone, Transaction, Debt, TransactionType, TransactionNature, ProfitBucket, TaxPayment, FixedCost } from './types.ts';

export const ANNUAL_GOAL = 550000;
export const DEFAULT_ALLOCATION_RATE = 0.20; // 20% default for home rateio
export const DEFAULT_PRO_LABORE = 12000; // Valor fixo de Pró-labore sugerido

export const PROFIT_BUCKETS: ProfitBucket[] = [
  { id: 'reinvest', name: 'Reinvestir (Empresa)', percentage: 0.30, color: '#6366f1', icon: 'TrendingUp' },
  { id: 'lazer', name: 'Lazer & Experiências', percentage: 0.20, color: '#f43f5e', icon: 'Heart' },
  { id: 'imagem', name: 'Imagem & Roupas', percentage: 0.15, color: '#8b5cf6', icon: 'Shirt' },
  { id: 'equip', name: 'Equipamentos/Tech', percentage: 0.15, color: '#0ea5e9', icon: 'Zap' },
  { id: 'doar', name: 'Doação', percentage: 0.10, color: '#10b981', icon: 'Gift' },
  { id: 'gastar', name: 'Gastar (Livre)', percentage: 0.10, color: '#f59e0b', icon: 'ShoppingBag' },
];

export const MILESTONES: Milestone[] = [
  { label: 'Primeiro Passo', target: 50000, reward: 'Jantar de Comemoração', icon: '🍽️' },
  { label: 'Consolidação', target: 150000, reward: 'Escapada de Fim de Semana', icon: '⛺' },
  { label: 'Paraíso Nacional', target: 275000, reward: 'Noronha (3 dias)', icon: '🏝️' },
  { label: 'Expansão Sólida', target: 400000, reward: 'Novo Setup de Trabalho', icon: '💻' },
  { label: 'Sonho Europeu', target: 550000, reward: 'Portugal (7 dias)', icon: '✈️' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2024-03-01', description: 'Consultoria Estratégica', amount: 20000, category: 'Serviços', type: TransactionType.INCOME, nature: TransactionNature.BUSINESS },
  { id: '3', date: '2024-03-05', description: 'Supermercado (Cartão PJ - ERRO)', amount: 850, category: 'Alimentação', type: TransactionType.EXPENSE, nature: TransactionNature.PERSONAL },
  { id: '5', date: '2024-03-15', description: 'Assinatura AI Business', amount: 150, category: 'Software', type: TransactionType.EXPENSE, nature: TransactionNature.BUSINESS },
];

export const INITIAL_DEBTS: Debt[] = [
  { id: 'd1', description: 'Financiamento Carro', totalAmount: 80000, remainingAmount: 32000, installmentValue: 1200, installmentsTotal: 60, installmentsPaid: 40 },
  { id: 'd2', description: 'IPVA 2024', totalAmount: 2400, remainingAmount: 800, installmentValue: 400, installmentsTotal: 6, installmentsPaid: 4 },
];

export const INITIAL_TAX_PAYMENTS: TaxPayment[] = [
  { id: 'tax1', date: '2024-02-20', taxName: 'DAS - Simples Nacional', amount: 1200, period: '01/24' },
  { id: 'tax2', date: '2024-03-20', taxName: 'DAS - Simples Nacional', amount: 1250, period: '02/24' },
];

export const INITIAL_FIXED_COSTS: FixedCost[] = [
  { id: 'f1', description: 'Aluguel Home Office', totalAmount: 4500, businessPercentage: 0.20, category: 'Habitação' },
  { id: 'f2', description: 'Internet Fibra', totalAmount: 250, businessPercentage: 1.0, category: 'Infra' },
  { id: 'f3', description: 'Energia Elétrica', totalAmount: 400, businessPercentage: 0.20, category: 'Utilidades' },
];
