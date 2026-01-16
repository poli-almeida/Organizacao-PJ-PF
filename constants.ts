
import { Milestone, Transaction, Debt, TransactionType, TransactionNature } from './types.ts';

export const ANNUAL_GOAL = 550000;
export const DEFAULT_ALLOCATION_RATE = 0.20; // 20% default for home rateio

export const MILESTONES: Milestone[] = [
  { label: 'Primeiro Passo', target: 50000, reward: 'Jantar de Comemoração', icon: '🍽️' },
  { label: 'Consolidação', target: 150000, reward: 'Escapada de Fim de Semana', icon: '⛺' },
  { label: 'Paraíso Nacional', target: 275000, reward: 'Noronha (3 dias)', icon: '🏝️' },
  { label: 'Expansão Sólida', target: 400000, reward: 'Novo Setup de Trabalho', icon: '💻' },
  { label: 'Sonho Europeu', target: 550000, reward: 'Portugal (7 dias)', icon: '✈️' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2024-03-01', description: 'Consultoria Estratégica', amount: 20000, category: 'Serviços', type: TransactionType.INCOME, nature: TransactionNature.BUSINESS },
  { id: '2', date: '2024-03-02', description: 'Aluguel Casa (Home Office)', amount: 4000, category: 'Habitação', type: TransactionType.EXPENSE, nature: TransactionNature.MIXED },
  { id: '3', date: '2024-03-05', description: 'Café no Iate Clube (Trabalho)', amount: 120, category: 'Ambiente', type: TransactionType.EXPENSE, nature: TransactionNature.BUSINESS },
  { id: '4', date: '2024-03-10', description: 'Pró-labore', amount: 8000, category: 'Folha', type: TransactionType.EXPENSE, nature: TransactionNature.BUSINESS },
  { id: '5', date: '2024-03-12', description: 'Luz & Internet', amount: 600, category: 'Habitação', type: TransactionType.EXPENSE, nature: TransactionNature.MIXED },
  { id: '6', date: '2024-03-15', description: 'Assinatura AI Business', amount: 150, category: 'Software', type: TransactionType.EXPENSE, nature: TransactionNature.BUSINESS },
];

export const INITIAL_DEBTS: Debt[] = [
  { id: 'd1', description: 'Financiamento Carro', totalAmount: 80000, remainingAmount: 32000, installmentValue: 1200, installmentsTotal: 60, installmentsPaid: 40 },
  { id: 'd2', description: 'IPVA 2024', totalAmount: 2400, remainingAmount: 800, installmentValue: 400, installmentsTotal: 6, installmentsPaid: 4 },
];
