
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb,
  X,
  ShieldCheck,
  Trash2,
  Pencil,
  Wallet,
  Zap,
  PieChart as PieChartIcon,
  Landmark,
  FileText,
  Gem,
  Sparkles,
  UserCheck,
  Trophy,
  CheckCircle2,
  Home,
  RefreshCcw,
  Crown,
  BarChart3,
  ShoppingBag,
  Calendar,
  AlertOctagon,
  Clock,
  Heart,
  Shirt,
  Gift
} from 'lucide-react';
import { 
  PieChart,
  Pie,
  Cell,
  Tooltip, 
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

import { 
  Transaction, 
  TransactionType, 
  TransactionNature, 
  Debt, 
  DebtType,
  TaxPayment,
  FixedCost
} from './types.ts';
import { 
  INITIAL_TRANSACTIONS, 
  INITIAL_DEBTS, 
  INITIAL_TAX_PAYMENTS,
  INITIAL_FIXED_COSTS,
  ANNUAL_GOAL, 
  DEFAULT_PRO_LABORE,
  MILESTONES,
  PROFIT_BUCKETS
} from './constants.ts';
import { StatCard, GoalCard } from './components/ui/Cards.tsx';
import { getFinancialTip } from './services/geminiService.ts';

const ACCESS_PIN = "2025";

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const parseSmartNumber = (val: string | number): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  let cleaned = val.toString().replace(/\s/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const TabularNumber = React.memo(({ value, className = "" }: { value: string | number, className?: string }) => (
  <span className={`tabular-nums ${className}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
    {value}
  </span>
));

const getBucketIcon = (iconName: string) => {
  switch (iconName) {
    case 'TrendingUp': return <TrendingUp size={24} />;
    case 'Heart': return <Heart size={24} />;
    case 'Shirt': return <Shirt size={24} />;
    case 'Zap': return <Zap size={24} />;
    case 'Gift': return <Gift size={24} />;
    case 'ShoppingBag': return <ShoppingBag size={24} />;
    default: return <Gem size={24} />;
  }
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('hana_auth') === 'true');
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'taxes' | 'debts' | 'buckets' | 'fixed-costs'>('dashboard');

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('hana_txs');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });
  const [debts, setDebts] = useState<Debt[]>(() => {
    const saved = localStorage.getItem('hana_debts');
    return saved ? JSON.parse(saved) : INITIAL_DEBTS;
  });
  const [taxPayments, setTaxPayments] = useState<TaxPayment[]>(() => {
    const saved = localStorage.getItem('hana_tax_paid');
    return saved ? JSON.parse(saved) : INITIAL_TAX_PAYMENTS;
  });
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>(() => {
    const saved = localStorage.getItem('hana_fixed_costs');
    return saved ? JSON.parse(saved) : INITIAL_FIXED_COSTS;
  });
  
  const [proLabore, setProLabore] = useState(() => Number(localStorage.getItem('hana_prolabore')) || DEFAULT_PRO_LABORE);
  const [taxRate] = useState(0.06);

  const [tip, setTip] = useState<string>('Clique para insight do CFO...');
  const [isTipLoading, setIsTipLoading] = useState(false);
  
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showFixedCostModal, setShowFixedCostModal] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [txFormData, setTxFormData] = useState({
    description: '', amount: '', category: 'Vendas', type: TransactionType.INCOME, nature: TransactionNature.BUSINESS, date: new Date().toISOString().split('T')[0]
  });

  const [taxFormData, setTaxFormData] = useState({
    taxName: 'DAS - Simples Nacional', amount: '', date: new Date().toISOString().split('T')[0], period: ''
  });

  const [debtFormData, setDebtFormData] = useState({
    description: '', totalAmount: '', remainingAmount: '', installmentValue: '', debtType: DebtType.OTHER, isHighRisk: false, interestRate: ''
  });

  const [fixedCostFormData, setFixedCostFormData] = useState({
    description: '', totalAmount: '', businessPercentage: '20', category: 'Fixa', endDate: ''
  });

  useEffect(() => { localStorage.setItem('hana_txs', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('hana_debts', JSON.stringify(debts)); }, [debts]);
  useEffect(() => { localStorage.setItem('hana_tax_paid', JSON.stringify(taxPayments)); }, [taxPayments]);
  useEffect(() => { localStorage.setItem('hana_fixed_costs', JSON.stringify(fixedCosts)); }, [fixedCosts]);
  useEffect(() => { localStorage.setItem('hana_prolabore', proLabore.toString()); }, [proLabore]);

  const stats = useMemo(() => {
    let revenue = 0;
    let businessOneOffCosts = 0;
    let personalLeakedInBusiness = 0;

    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME) revenue += t.amount;
      else {
        if (t.nature === TransactionNature.BUSINESS) businessOneOffCosts += t.amount;
        else if (t.nature === TransactionNature.PERSONAL) personalLeakedInBusiness += t.amount;
        else if (t.nature === TransactionNature.MIXED) businessOneOffCosts += t.amount * 0.20;
      }
    });

    const monthlyFixedCostsBusiness = fixedCosts.reduce((acc, curr) => acc + (curr.totalAmount * curr.businessPercentage), 0);
    const totalTaxesPaid = taxPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const totalBusinessCosts = businessOneOffCosts + monthlyFixedCostsBusiness + proLabore + totalTaxesPaid;
    const realProfitValue = revenue - totalBusinessCosts;

    return {
      totalRevenue: revenue,
      totalBusinessCosts,
      taxProvision: revenue * taxRate,
      totalTaxesPaid,
      proLabore,
      monthlyFixedCostsBusiness,
      realProfit: Math.max(0, realProfitValue),
      accountMixLeakage: (totalBusinessCosts + personalLeakedInBusiness) > 0 ? (personalLeakedInBusiness / (totalBusinessCosts + personalLeakedInBusiness)) * 100 : 0,
      goalProgress: (revenue / ANNUAL_GOAL) * 100,
      personalLeakedInBusiness
    };
  }, [transactions, taxPayments, fixedCosts, taxRate, proLabore]);

  const bucketDistribution = useMemo(() => {
    return PROFIT_BUCKETS.map(bucket => ({
      ...bucket,
      value: stats.realProfit * bucket.percentage
    }));
  }, [stats.realProfit]);

  const xRayChartData = useMemo(() => [
    { name: 'Lucro Real', value: stats.realProfit, color: '#10b981' },
    { name: 'Pró-labore', value: stats.proLabore, color: '#6366f1' },
    { name: 'Fixos (Rateio)', value: stats.monthlyFixedCostsBusiness, color: '#0ea5e9' },
    { name: 'Impostos Pagos', value: stats.totalTaxesPaid, color: '#f59e0b' },
  ].filter(d => d.value > 0), [stats]);

  const categoryChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === TransactionType.EXPENSE) {
        let amount = t.nature === TransactionNature.BUSINESS ? t.amount : t.nature === TransactionNature.MIXED ? t.amount * 0.20 : 0;
        if (amount > 0) categories[t.category] = (categories[t.category] || 0) + amount;
      }
    });
    fixedCosts.forEach(c => { categories[c.category] = (categories[c.category] || 0) + (c.totalAmount * c.businessPercentage); });
    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions, fixedCosts]);

  const monthlyFlowData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return months.map((m, idx) => ({
      name: m,
      Receita: idx === 2 ? stats.totalRevenue : stats.totalRevenue * (0.8 + Math.random() * 0.4),
      Custos: idx === 2 ? stats.totalBusinessCosts : stats.totalBusinessCosts * (0.9 + Math.random() * 0.2),
    }));
  }, [stats.totalRevenue, stats.totalBusinessCosts]);

  const nextMilestone = useMemo(() => {
    return MILESTONES.find(m => stats.totalRevenue < m.target) || MILESTONES[MILESTONES.length - 1];
  }, [stats.totalRevenue]);

  const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'];

  const handleAuth = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ACCESS_PIN) { setIsAuthenticated(true); localStorage.setItem('hana_auth', 'true'); }
    else setPinInput('');
  }, [pinInput]);

  const handleFetchTip = useCallback(async () => {
    if (isTipLoading) return;
    setIsTipLoading(true);
    const newTip = await getFinancialTip(stats as any, ANNUAL_GOAL);
    setTip(newTip);
    setIsTipLoading(false);
  }, [stats, isTipLoading]);

  // Handlers CRUD
  const handleEditTransaction = (tx: Transaction) => {
    setEditingId(tx.id);
    setTxFormData({ description: tx.description, amount: tx.amount.toString().replace('.', ','), category: tx.category, type: tx.type, nature: tx.nature, date: tx.date });
    setShowTransactionModal(true);
  };
  const handleSaveTransaction = useCallback(() => {
    const amount = parseSmartNumber(txFormData.amount);
    if (!txFormData.description || !amount) return;
    if (editingId) setTransactions(prev => prev.map(t => t.id === editingId ? { ...t, ...txFormData, amount } : t));
    else setTransactions(prev => [{ ...txFormData, amount, id: Math.random().toString(36).substr(2, 9) } as Transaction, ...prev]);
    setShowTransactionModal(false); setEditingId(null);
  }, [txFormData, editingId]);

  const handleEditTax = (tax: TaxPayment) => {
    setEditingId(tax.id);
    setTaxFormData({ taxName: tax.taxName, amount: tax.amount.toString().replace('.', ','), date: tax.date, period: tax.period });
    setShowTaxModal(true);
  };
  const handleSaveTax = useCallback(() => {
     const amount = parseSmartNumber(taxFormData.amount);
     if (!amount) return;
     if (editingId) setTaxPayments(prev => prev.map(t => t.id === editingId ? { ...t, ...taxFormData, amount } : t));
     else setTaxPayments(prev => [{ ...taxFormData, amount, id: Math.random().toString(36).substr(2, 9) } as TaxPayment, ...prev]);
     setShowTaxModal(false); setEditingId(null);
  }, [taxFormData, editingId]);

  const handleEditDebt = (debt: Debt) => {
    setEditingId(debt.id);
    setDebtFormData({ 
      description: debt.description, 
      totalAmount: debt.totalAmount.toString().replace('.', ','), 
      remainingAmount: debt.remainingAmount.toString().replace('.', ','), 
      installmentValue: debt.installmentValue.toString().replace('.', ','),
      debtType: debt.debtType || DebtType.OTHER,
      isHighRisk: debt.isHighRisk || false,
      interestRate: debt.interestRate?.toString() || ''
    });
    setShowDebtModal(true);
  };
  const handleSaveDebt = useCallback(() => {
    const total = parseSmartNumber(debtFormData.totalAmount);
    const remaining = parseSmartNumber(debtFormData.remainingAmount);
    const installment = parseSmartNumber(debtFormData.installmentValue);
    const interestRate = parseSmartNumber(debtFormData.interestRate);
    if (!debtFormData.description || !total) return;
    const isHighRisk = debtFormData.debtType === DebtType.CREDIT_CARD || debtFormData.isHighRisk;
    
    if (editingId) setDebts(prev => prev.map(d => d.id === editingId ? { ...d, ...debtFormData, totalAmount: total, remainingAmount: remaining, installmentValue: installment, interestRate, isHighRisk } : d));
    else setDebts(prev => [{ ...debtFormData, totalAmount: total, remainingAmount: remaining, installmentValue: installment, interestRate, isHighRisk, id: Math.random().toString(36).substr(2, 9), startDate: new Date().toISOString() } as Debt, ...prev]);
    setShowDebtModal(false); setEditingId(null);
  }, [debtFormData, editingId]);

  const handleEditFixedCost = (cost: FixedCost) => {
    setEditingId(cost.id);
    setFixedCostFormData({
      description: cost.description,
      totalAmount: cost.totalAmount.toString().replace('.', ','),
      businessPercentage: (cost.businessPercentage * 100).toString(),
      category: cost.category,
      endDate: cost.endDate || ''
    });
    setShowFixedCostModal(true);
  };
  const handleSaveFixedCost = useCallback(() => {
    const amount = parseSmartNumber(fixedCostFormData.totalAmount);
    const percentage = Number(fixedCostFormData.businessPercentage) / 100;
    if (!fixedCostFormData.description || !amount) return;
    if (editingId) setFixedCosts(prev => prev.map(c => c.id === editingId ? { ...c, ...fixedCostFormData, totalAmount: amount, businessPercentage: percentage } : c));
    else setFixedCosts(prev => [{ ...fixedCostFormData, totalAmount: amount, businessPercentage: percentage, id: Math.random().toString(36).substr(2, 9) } as FixedCost, ...prev]);
    setShowFixedCostModal(false); setEditingId(null);
  }, [fixedCostFormData, editingId]);

  const handleDeleteItem = (listName: string, id: string) => {
    if (!confirm('Deseja excluir este item permanentemente?')) return;
    if (listName === 'tx') setTransactions(prev => prev.filter(t => t.id !== id));
    if (listName === 'tax') setTaxPayments(prev => prev.filter(t => t.id !== id));
    if (listName === 'debt') setDebts(prev => prev.filter(d => d.id !== id));
    if (listName === 'fixed') setFixedCosts(prev => prev.filter(c => c.id !== id));
  };

  const getDebtBadge = (type: DebtType) => {
    switch (type) {
      case DebtType.CREDIT_CARD: return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1"><AlertOctagon size={10} /> Alto Juros (Cartão)</span>;
      case DebtType.RENEGOTIATION: return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1"><RefreshCcw size={10} /> Renegociado</span>;
      case DebtType.FINANCING: return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1"><Home size={10} /> Financiamento</span>;
      default: return <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest">Geral</span>;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/5 border border-white/10 p-10 rounded-[2.5rem] shadow-2xl text-center">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6"><Sparkles className="text-indigo-400 w-10 h-10" /></div>
          <h1 className="text-2xl font-bold text-white mb-2 italic tracking-tighter">Hana Finance</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="password" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 text-center text-3xl text-white outline-none" placeholder="••••" />
            <button type="submit" className="w-full bg-indigo-600 py-4 rounded-2xl text-white font-bold hover:bg-indigo-700 transition-all">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fbfcfd]">
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-auto md:h-screen z-10">
        <div className="p-8 border-b border-slate-100 flex items-center gap-3">
          <Sparkles className="text-indigo-600 w-6 h-6" />
          <span className="font-black text-xl tracking-tighter text-slate-900 italic">Hana Finance</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'transactions', label: 'Fluxo de Caixa', icon: TrendingUp },
            { id: 'fixed-costs', label: 'Custos Fixos', icon: RefreshCcw },
            { id: 'buckets', label: 'Baldes de Lucro', icon: Gem },
            { id: 'taxes', label: 'Impostos (BR)', icon: Landmark },
            { id: 'debts', label: 'Dívidas & Risco', icon: CreditCard },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-slate-100">
          <div className="bg-slate-900 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2"><Lightbulb size={16} /> <span className="text-[10px] uppercase tracking-widest">IA Strategic Advisor</span></div>
            <p className="text-[11px] leading-relaxed opacity-80 mb-4">{isTipLoading ? 'Analisando...' : tip}</p>
            <button onClick={handleFetchTip} disabled={isTipLoading} className="w-full py-2 bg-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-500 disabled:opacity-50 uppercase tracking-widest">Insight</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-12 space-y-10 overflow-x-hidden">
        {/* --- DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500 space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div>
                 <h1 className="text-3xl font-black text-slate-900 tracking-tighter">CFO Strategic View</h1>
                 <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Gestão Profissional de Home Office</p>
               </div>
               <div className="flex items-center gap-4">
                  <div className="bg-white border p-3 rounded-2xl flex items-center gap-6 shadow-sm border-slate-100">
                     <div className="text-center">
                        <p className="text-[9px] uppercase font-black text-slate-400 mb-1">Pró-labore</p>
                        <p className="text-sm font-black text-indigo-600 tabular-nums">{formatCurrency(proLabore)}</p>
                     </div>
                     <div className="w-[1px] h-8 bg-slate-100"></div>
                     <div className="text-center">
                        <p className="text-[9px] uppercase font-black text-slate-400 mb-1">Dívida Total</p>
                        <p className="text-sm font-black text-rose-600 tabular-nums">{formatCurrency(debts.reduce((a,b)=>a+b.remainingAmount,0))}</p>
                     </div>
                  </div>
                  <button onClick={() => { setEditingId(null); setShowTransactionModal(true); }} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-600/30 hover:scale-105 transition-all"><PlusCircle size={24} /></button>
               </div>
             </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Receita Bruta" value={<TabularNumber value={formatCurrency(stats.totalRevenue)} />} icon={<Wallet className="text-emerald-500" />} />
              <StatCard title="Custos Empresa (PJ)" value={<TabularNumber value={formatCurrency(stats.totalBusinessCosts)} />} subtitle="Saídas PJ Totais" icon={<UserCheck className="text-indigo-500" />} />
              <StatCard title="Lucro Real Líquido" value={<TabularNumber value={formatCurrency(stats.realProfit)} />} subtitle="Distribuível" icon={<Gem className="text-amber-500" />} color="bg-amber-50/30 border-amber-100" />
              <div className={`p-6 rounded-2xl border ${stats.accountMixLeakage > 5 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'} shadow-sm`}>
                 <div className="flex justify-between items-start"><h3 className="text-slate-500 text-sm font-medium">Leakage</h3><AlertTriangle className={stats.accountMixLeakage > 5 ? 'text-rose-600' : 'text-slate-400'} size={18} /></div>
                 <div className="mt-4"><span className={`text-2xl font-black ${stats.accountMixLeakage > 5 ? 'text-rose-700' : 'text-slate-900'}`}>{stats.accountMixLeakage.toFixed(1)}%</span><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Contas Misturadas</p></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="font-bold text-lg mb-8 flex items-center gap-2 text-slate-800"><BarChart3 className="text-indigo-600" /> Fluxo de Caixa Mensal</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyFlowData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                      <Legend iconType="circle" />
                      <Bar dataKey="Receita" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Custos" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800"><PieChartIcon className="text-indigo-600" /> Raio-X Financeiro (PJ)</h3>
                <div className="h-[280px] w-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={xRayChartData} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                        {xRayChartData.map((entry, index) => <Cell key={`cell-xray-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend verticalAlign="bottom" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Gamification Map */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="space-y-6">
                 <GoalCard progress={stats.totalRevenue} target={ANNUAL_GOAL} />
                 <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Trophy size={140} /></div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Próxima Recompensa</p>
                    <h3 className="text-3xl font-black mb-1 tracking-tight">{nextMilestone.reward}</h3>
                    <p className="text-slate-400 text-sm mb-8">Meta para atingir: <TabularNumber value={formatCurrency(nextMilestone.target)} /></p>
                    <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden shadow-inner">
                      <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.totalRevenue / nextMilestone.target) * 100)}%` }}></div>
                    </div>
                    <p className="mt-4 text-[11px] font-bold text-slate-500 uppercase italic">Faltam <TabularNumber value={formatCurrency(Math.max(0, nextMilestone.target - stats.totalRevenue))} /></p>
                 </div>
               </div>

               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-800 mb-8 flex items-center gap-2"><Crown className="text-amber-500" /> Mapa de Conquistas (Rewards)</h3>
                  <div className="space-y-6 relative">
                    <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-slate-50"></div>
                    {MILESTONES.map((m, idx) => {
                      const isUnlocked = stats.totalRevenue >= m.target;
                      return (
                        <div key={idx} className={`relative flex items-center gap-6 transition-all ${isUnlocked ? 'opacity-100 scale-100' : 'opacity-40 grayscale blur-[0.5px]'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 border-4 ${isUnlocked ? 'bg-indigo-600 border-indigo-100 text-white' : 'bg-white border-slate-100 text-slate-300'}`}>
                            {isUnlocked ? <CheckCircle2 size={16} /> : <span className="text-xs font-black">{idx + 1}</span>}
                          </div>
                          <div className="flex-1">
                             <p className="text-xs font-black text-slate-800 tracking-tight">{m.reward}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(m.target)}</p>
                          </div>
                          <div className="text-2xl">{m.icon}</div>
                        </div>
                      );
                    })}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* --- TRANSACTIONS --- */}
        {activeTab === 'transactions' && (
           <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center"><h2 className="text-3xl font-black tracking-tighter">Fluxo de Caixa Estratégico</h2><button onClick={() => { setEditingId(null); setShowTransactionModal(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg">Novo Lançamento</button></div>
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden"><table className="w-full text-left min-w-[700px]"><thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b"><tr><th className="p-8">Data</th><th className="p-8">Descrição</th><th className="p-8 text-right">Valor</th><th className="p-8 text-center">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{transactions.map(t => (<tr key={t.id} className="hover:bg-slate-50/50 transition-colors group"><td className="p-8 text-xs text-slate-400 tabular-nums">{new Date(t.date).toLocaleDateString('pt-BR')}</td><td className="p-8 font-black text-slate-800">{t.description}</td><td className={`p-8 text-right font-black tabular-nums ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-900'}`}>{t.type === TransactionType.INCOME ? '+' : ''} {formatCurrency(t.amount)}</td><td className="p-8 text-center"><div className="flex items-center justify-center gap-4"><button onClick={() => handleEditTransaction(t)} className="p-2 text-slate-300 hover:text-indigo-600"><Pencil size={18} /></button><button onClick={() => handleDeleteItem('tx', t.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button></div></td></tr>))}</tbody></table></div>
           </div>
        )}

        {/* --- FIXED COSTS --- */}
        {activeTab === 'fixed-costs' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div><h2 className="text-3xl font-black text-slate-900 tracking-tighter">Custos Fixos & Rateio</h2><p className="text-sm text-slate-500">Gestão rigorosa de contas recorrentes com separação home office.</p></div>
               <button onClick={() => { setEditingId(null); setShowFixedCostModal(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2"><PlusCircle size={18} /> Novo Custo</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {fixedCosts.map(c => (
                   <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group flex flex-col justify-between min-h-[250px]">
                      <div>
                        <div className="flex justify-between items-start mb-6">
                           <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Home size={24} /></div>
                           <div className="flex gap-2">
                              <button onClick={() => handleEditFixedCost(c)} className="p-2 text-slate-300 hover:text-indigo-600"><Pencil size={18} /></button>
                              <button onClick={() => handleDeleteItem('fixed', c.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button>
                           </div>
                        </div>
                        <h4 className="font-black text-slate-800 text-xl mb-1 tracking-tight">{c.description}</h4>
                        <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] mb-4"><span>Total Mensal</span><span className="tabular-nums text-slate-700">{formatCurrency(c.totalAmount)}</span></div>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-slate-50">
                         <div className="flex justify-between items-end">
                            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Peso Empresa ({c.businessPercentage*100}%)</p><p className="text-xl font-black text-indigo-600 tabular-nums">{formatCurrency(c.totalAmount * c.businessPercentage)}</p></div>
                         </div>
                         <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner"><div className="bg-indigo-500 h-full transition-all duration-700" style={{ width: `${c.businessPercentage*100}%` }}></div></div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* --- BALDES DE LUCRO --- */}
        {activeTab === 'buckets' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div><h2 className="text-3xl font-black text-slate-900 tracking-tighter">Ordenador de Verbas (Buckets)</h2><p className="text-sm text-slate-500">Distribuição estratégica baseada no lucro real: <span className="font-bold text-indigo-600 tabular-nums">{formatCurrency(stats.realProfit)}</span></p></div>
              <div className="bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 font-bold text-xs border border-emerald-100 flex items-center gap-2"><ShieldCheck size={16} /> Pró-labore e Rateios já descontados</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {bucketDistribution.map(b => (
                <div key={b.id} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between group overflow-hidden relative min-h-[220px]">
                   <div className="absolute -top-10 -right-10 w-32 h-32 opacity-5" style={{ backgroundColor: b.color, borderRadius: '100%' }}></div>
                   <div className="flex justify-between items-start mb-6">
                      <div className="p-4 rounded-2xl" style={{ backgroundColor: `${b.color}20`, color: b.color }}>{getBucketIcon(b.icon)}</div>
                      <span className="text-[11px] font-black px-3 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-100 tabular-nums">{b.percentage * 100}%</span>
                   </div>
                   <div>
                      <h4 className="font-black text-slate-800 text-xl mb-1 tracking-tight">{b.name}</h4>
                      <p className="text-3xl font-black tracking-tighter tabular-nums" style={{ color: b.color }}>{formatCurrency(b.value)}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- IMPOSTOS --- */}
        {activeTab === 'taxes' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-300">
             <div className="flex justify-between items-center">
               <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Impostos (BR)</h2>
               <button onClick={() => { setEditingId(null); setShowTaxModal(true); }} className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-amber-600 transition-all flex items-center gap-2">
                 <FileText size={18} /> Registrar Guia Paga
               </button>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Pago (Ano)" value={<TabularNumber value={formatCurrency(stats.totalTaxesPaid)} />} icon={<Landmark className="text-amber-600" />} />
                <StatCard title="Provisionado Estimado" value={<TabularNumber value={formatCurrency(stats.taxProvision)} />} subtitle="Baseado em 6% (Simples)" icon={<FileText className="text-slate-400" />} />
             </div>

             <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden"><table className="w-full text-left min-w-[700px]"><thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b"><tr><th className="p-8">Data Pagto</th><th className="p-8">Imposto</th><th className="p-8">Competência</th><th className="p-8 text-right">Valor Pago</th><th className="p-8 text-center">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{taxPayments.map(p => (<tr key={p.id} className="hover:bg-slate-50/50 transition-colors group"><td className="p-8 text-xs text-slate-400 tabular-nums">{new Date(p.date).toLocaleDateString('pt-BR')}</td><td className="p-8 font-black text-slate-800">{p.taxName}</td><td className="p-8 text-sm text-slate-500 tabular-nums">{p.period}</td><td className="p-8 text-right font-black text-amber-600 tabular-nums">{formatCurrency(p.amount)}</td><td className="p-8 text-center"><div className="flex items-center justify-center gap-4"><button onClick={() => handleEditTax(p)} className="p-2 text-slate-300 hover:text-indigo-600"><Pencil size={18} /></button><button onClick={() => handleDeleteItem('tax', p.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button></div></td></tr>))}</tbody></table></div>
          </div>
        )}

        {/* --- DÍVIDAS --- */}
        {activeTab === 'debts' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div><h2 className="text-3xl font-black text-slate-900 tracking-tighter">Gestão de Dívidas & Risco</h2><p className="text-sm text-slate-500">Análise preditiva e identificação de juros abusivos.</p></div>
               <button onClick={() => { setEditingId(null); setShowDebtModal(true); }} className="bg-rose-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2"><CreditCard size={18} /> Cadastrar Nova Dívida</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {debts.map(d => {
                 const prog = Math.min(100, ((d.totalAmount - d.remainingAmount) / (d.totalAmount || 1)) * 100);
                 const installmentsLeft = d.installmentValue > 0 ? Math.ceil(d.remainingAmount / d.installmentValue) : 0;
                 const isCritical = d.isHighRisk || d.debtType === DebtType.CREDIT_CARD;
                 return (
                   <div key={d.id} className={`p-8 rounded-[2.5rem] border ${isCritical ? 'bg-rose-50/30 border-rose-200' : 'bg-white border-slate-100'} shadow-sm relative group`}>
                      <div className="flex justify-between items-start mb-6">
                         <div className="space-y-2">
                            {getDebtBadge(d.debtType)}
                            <h4 className="font-black text-xl text-slate-800 tracking-tight">{d.description}</h4>
                         </div>
                         <div className="flex gap-1">
                            <button onClick={() => handleEditDebt(d)} className="p-2 text-slate-300 hover:text-indigo-600"><Pencil size={18} /></button>
                            <button onClick={() => handleDeleteItem('debt', d.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button>
                         </div>
                      </div>
                      <div className="space-y-6">
                         <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span>Quitação Realizada</span><span>{prog.toFixed(0)}%</span></div>
                         <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-1000 ${isCritical ? 'bg-rose-600' : 'bg-indigo-600'}`} style={{ width: `${prog}%` }}></div></div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/60 p-4 rounded-2xl border border-slate-100 shadow-sm">
                               <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Saldo Devedor</p>
                               <p className={`text-lg font-black tabular-nums ${isCritical ? 'text-rose-600' : 'text-slate-800'}`}>{formatCurrency(d.remainingAmount)}</p>
                            </div>
                            <div className="bg-white/60 p-4 rounded-2xl border border-slate-100 shadow-sm">
                               <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Impacto Mensal</p>
                               <p className="text-lg font-black text-slate-800 tabular-nums">{formatCurrency(d.installmentValue)}</p>
                            </div>
                         </div>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2"><Clock size={16} /> Faltam aproximadamente {installmentsLeft} parcelas.</p>
                      </div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        {/* MODALS SECTION */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-150">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800 tracking-tighter">Novo Lançamento</h2><button onClick={() => setShowTransactionModal(false)}><X /></button></div>
              <div className="p-10 space-y-8">
                <div className="flex bg-slate-50 p-2 rounded-[1.5rem]"><button onClick={() => setTxFormData({...txFormData, type: TransactionType.INCOME})} className={`flex-1 py-4 rounded-2xl text-xs font-black transition-all ${txFormData.type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-400'}`}>Entrada</button><button onClick={() => setTxFormData({...txFormData, type: TransactionType.EXPENSE})} className={`flex-1 py-4 rounded-2xl text-xs font-black transition-all ${txFormData.type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-lg' : 'text-slate-400'}`}>Saída</button></div>
                <input type="text" placeholder="Descrição" value={txFormData.description} onChange={e => setTxFormData({...txFormData, description: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-bold" />
                <input type="text" value={txFormData.amount} onChange={e => setTxFormData({...txFormData, amount: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-black text-2xl" placeholder="R$ 0,00" />
                <select value={txFormData.nature} onChange={e => setTxFormData({...txFormData, nature: e.target.value as TransactionNature})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-black text-sm">
                  <option value={TransactionNature.BUSINESS}>Empresa (PJ)</option>
                  <option value={TransactionNature.PERSONAL}>Pessoal (ERRO)</option>
                  <option value={TransactionNature.MIXED}>Misto (Rateio)</option>
                </select>
                <button onClick={handleSaveTransaction} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-xl hover:bg-indigo-700 uppercase tracking-widest">Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {showTaxModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-150">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800 tracking-tighter">Registrar Guia Paga</h2><button onClick={() => setShowTaxModal(false)}><X /></button></div>
              <div className="p-10 space-y-6">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Imposto</label><select value={taxFormData.taxName} onChange={e => setTaxFormData({...taxFormData, taxName: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-black text-sm">
                  <option value="DAS - Simples Nacional">DAS - Simples Nacional</option>
                  <option value="ISS Municipal">ISS Municipal</option>
                  <option value="INSS">INSS / Pró-labore</option>
                  <option value="IRPF">IRPF Pessoa Física</option>
                </select></div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Valor</label><input type="text" value={taxFormData.amount} onChange={e => setTaxFormData({...taxFormData, amount: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-black" placeholder="R$ 0,00" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Competência</label><input type="text" value={taxFormData.period} onChange={e => setTaxFormData({...taxFormData, period: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-bold" placeholder="MM/AA" /></div>
                </div>
                <button onClick={handleSaveTax} className="w-full py-6 bg-amber-500 text-white font-black rounded-[1.5rem] shadow-xl uppercase tracking-widest">Salvar Registro</button>
              </div>
            </div>
          </div>
        )}

        {showDebtModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-150 my-auto">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800 tracking-tighter">Configurar Dívida</h2><button onClick={() => { setShowDebtModal(false); setEditingId(null); }}><X /></button></div>
              <div className="p-10 space-y-6">
                <input type="text" placeholder="Descrição" value={debtFormData.description} onChange={e => setDebtFormData({...debtFormData, description: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-bold" />
                <select value={debtFormData.debtType} onChange={e => setDebtFormData({...debtFormData, debtType: e.target.value as DebtType})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-black text-sm">
                   <option value={DebtType.CREDIT_CARD}>Cartão de Crédito</option>
                   <option value={DebtType.RENEGOTIATION}>Renegociação</option>
                   <option value={DebtType.FINANCING}>Financiamento</option>
                   <option value={DebtType.OTHER}>Outros</option>
                </select>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Total</label><input type="text" value={debtFormData.totalAmount} onChange={e => setDebtFormData({...debtFormData, totalAmount: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-black" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Saldo Atual</label><input type="text" value={debtFormData.remainingAmount} onChange={e => setDebtFormData({...debtFormData, remainingAmount: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-black text-rose-600" /></div>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Parcela Mensal</label><input type="text" value={debtFormData.installmentValue} onChange={e => setDebtFormData({...debtFormData, installmentValue: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-black" /></div>
                <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-100 rounded-[1.5rem]"><input type="checkbox" checked={debtFormData.isHighRisk} onChange={e => setDebtFormData({...debtFormData, isHighRisk: e.target.checked})} className="w-5 h-5 accent-rose-600" /><span className="text-[10px] font-black uppercase text-slate-400">Marcar como Alto Risco (Juros)</span></div>
                <button onClick={handleSaveDebt} className="w-full py-6 bg-rose-600 text-white font-black rounded-[1.5rem] shadow-xl uppercase tracking-widest">Salvar Dívida</button>
              </div>
            </div>
          </div>
        )}

        {showFixedCostModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-150">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800 tracking-tighter">Custo Estrutural</h2><button onClick={() => { setShowFixedCostModal(false); setEditingId(null); }}><X /></button></div>
              <div className="p-10 space-y-6">
                <input type="text" placeholder="Descrição" value={fixedCostFormData.description} onChange={e => setFixedCostFormData({...fixedCostFormData, description: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-bold" />
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Valor Total</label><input type="text" value={fixedCostFormData.totalAmount} onChange={e => setFixedCostFormData({...fixedCostFormData, totalAmount: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-black" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">% Empresa</label><input type="number" value={fixedCostFormData.businessPercentage} onChange={e => setFixedCostFormData({...fixedCostFormData, businessPercentage: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-black" /></div>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Finaliza em (Opcional)</label><input type="date" value={fixedCostFormData.endDate} onChange={e => setFixedCostFormData({...fixedCostFormData, endDate: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-bold" /></div>
                <button onClick={handleSaveFixedCost} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-xl uppercase tracking-widest">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
