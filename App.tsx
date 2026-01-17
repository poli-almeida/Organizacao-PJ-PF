
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
  Shirt,
  Heart,
  Gift,
  ShoppingBag,
  Sparkles,
  UserCheck,
  Trophy,
  CheckCircle2,
  Home,
  RefreshCcw,
  Crown,
  BarChart3
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
    description: '', totalAmount: '', remainingAmount: '', installmentValue: ''
  });

  const [fixedCostFormData, setFixedCostFormData] = useState({
    description: '', totalAmount: '', businessPercentage: '20', category: 'Fixa'
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

  // Gráfico 1: Distribuição de Gastos Empresa (Pizza)
  const xRayChartData = useMemo(() => [
    { name: 'Lucro Real', value: stats.realProfit, color: '#10b981' },
    { name: 'Pró-labore', value: stats.proLabore, color: '#6366f1' },
    { name: 'Fixos (Rateio)', value: stats.monthlyFixedCostsBusiness, color: '#0ea5e9' },
    { name: 'Impostos Pagos', value: stats.totalTaxesPaid, color: '#f59e0b' },
  ].filter(d => d.value > 0), [stats]);

  // Gráfico 2: Categorias de Gastos (Pizza)
  const categoryChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    
    // Gastos pontuais
    transactions.forEach(t => {
      if (t.type === TransactionType.EXPENSE) {
        let amount = 0;
        if (t.nature === TransactionNature.BUSINESS) amount = t.amount;
        else if (t.nature === TransactionNature.MIXED) amount = t.amount * 0.20;
        
        if (amount > 0) {
          categories[t.category] = (categories[t.category] || 0) + amount;
        }
      }
    });

    // Gastos fixos (rateio)
    fixedCosts.forEach(c => {
      const amount = c.totalAmount * c.businessPercentage;
      categories[c.category] = (categories[c.category] || 0) + amount;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, fixedCosts]);

  // Gráfico 3: Fluxo Mensal (Barras - Simulado base nos dados atuais)
  const monthlyFlowData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return months.map((m, idx) => ({
      name: m,
      Receita: idx === 2 ? stats.totalRevenue : stats.totalRevenue * (0.8 + Math.random() * 0.4),
      Custos: idx === 2 ? stats.totalBusinessCosts : stats.totalBusinessCosts * (0.9 + Math.random() * 0.2),
    }));
  }, [stats.totalRevenue, stats.totalBusinessCosts]);

  const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'];

  const nextMilestone = useMemo(() => {
    return MILESTONES.find(m => stats.totalRevenue < m.target) || MILESTONES[MILESTONES.length - 1];
  }, [stats.totalRevenue]);

  const level = useMemo(() => {
    const unlocked = MILESTONES.filter(m => stats.totalRevenue >= m.target).length;
    return {
      current: unlocked,
      title: unlocked === 0 ? "Iniciante Home Office" :
             unlocked === 1 ? "Empreendedor Solo" :
             unlocked === 2 ? "Faturador Pro" :
             unlocked === 3 ? "Mestre do Lucro" :
             unlocked === 4 ? "CFO Estratégico" : "Legenda Hana Finance"
    };
  }, [stats.totalRevenue]);

  const bucketDistribution = useMemo(() => {
    return PROFIT_BUCKETS.map(b => ({
      ...b,
      value: stats.realProfit * b.percentage
    }));
  }, [stats.realProfit]);

  const handleAuth = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ACCESS_PIN) { setIsAuthenticated(true); localStorage.setItem('hana_auth', 'true'); }
    else { setPinInput(''); }
  }, [pinInput]);

  const handleFetchTip = useCallback(async () => {
    if (isTipLoading) return;
    setIsTipLoading(true);
    const newTip = await getFinancialTip(stats as any, ANNUAL_GOAL);
    setTip(newTip);
    setIsTipLoading(false);
  }, [stats, isTipLoading]);

  // Handlers Edição/Save
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
    setDebtFormData({ description: debt.description, totalAmount: debt.totalAmount.toString().replace('.', ','), remainingAmount: debt.remainingAmount.toString().replace('.', ','), installmentValue: debt.installmentValue.toString().replace('.', ',') });
    setShowDebtModal(true);
  };
  const handleSaveDebt = useCallback(() => {
    const total = parseSmartNumber(debtFormData.totalAmount);
    const remaining = parseSmartNumber(debtFormData.remainingAmount);
    const installment = parseSmartNumber(debtFormData.installmentValue);
    if (!debtFormData.description || !total) return;
    if (editingId) setDebts(prev => prev.map(d => d.id === editingId ? { ...d, ...debtFormData, totalAmount: total, remainingAmount: Math.max(0, Math.min(remaining, total)), installmentValue: installment } : d));
    else setDebts(prev => [{ ...debtFormData, totalAmount: total, remainingAmount: Math.max(0, Math.min(remaining, total)), installmentValue: installment, id: Math.random().toString(36).substr(2, 9) } as Debt, ...prev]);
    setShowDebtModal(false); setEditingId(null);
  }, [debtFormData, editingId]);

  const handleEditFixedCost = (cost: FixedCost) => {
    setEditingId(cost.id);
    setFixedCostFormData({
      description: cost.description,
      totalAmount: cost.totalAmount.toString().replace('.', ','),
      businessPercentage: (cost.businessPercentage * 100).toString(),
      category: cost.category
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/5 border border-white/10 p-10 rounded-[2.5rem] shadow-2xl text-center">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6"><Sparkles className="text-indigo-400 w-10 h-10" /></div>
          <h1 className="text-2xl font-bold text-white mb-2 italic">Hana Finance</h1>
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
          <span className="font-bold text-xl tracking-tight text-slate-900 italic">Hana Finance</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'transactions', label: 'Fluxo de Caixa', icon: TrendingUp },
            { id: 'fixed-costs', label: 'Custos Fixos', icon: RefreshCcw },
            { id: 'buckets', label: 'Baldes de Lucro', icon: Gem },
            { id: 'taxes', label: 'Impostos (BR)', icon: Landmark },
            { id: 'debts', label: 'Dívidas', icon: CreditCard },
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
            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2"><Lightbulb size={16} /> <span className="text-[10px] uppercase tracking-widest">IA Advisor</span></div>
            <p className="text-[11px] leading-relaxed opacity-80 mb-4">{isTipLoading ? 'Consultando IA...' : tip}</p>
            <button onClick={handleFetchTip} disabled={isTipLoading} className="w-full py-2 bg-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-500 disabled:opacity-50">GERAR INSIGHT</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-12 space-y-10 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-200">{level.current}</div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{level.title}</h1>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Hana Finance Strategic Overview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-white border p-3 rounded-2xl flex items-center gap-4 shadow-sm border-slate-100">
                <div className="text-center px-2">
                   <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Pró-labore Fixo</p>
                   <input type="number" value={proLabore} onChange={e => setProLabore(Number(e.target.value))} className="w-24 text-sm font-black text-indigo-600 outline-none bg-transparent tabular-nums" />
                </div>
                <div className="w-[1px] h-8 bg-slate-100"></div>
                <div className="text-center px-2">
                   <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Fixo Mensal (PJ)</p>
                   <span className="text-sm font-black text-slate-700 tabular-nums">{formatCurrency(stats.monthlyFixedCostsBusiness)}</span>
                </div>
             </div>
             <button onClick={() => { setEditingId(null); setShowTransactionModal(true); }} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-600/30 hover:scale-105 transition-all"><PlusCircle size={24} /></button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500 space-y-10">
            {/* Cards de Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Receita Bruta" value={<TabularNumber value={formatCurrency(stats.totalRevenue)} />} icon={<Wallet className="text-emerald-500" />} />
              <StatCard title="Custos PJ" value={<TabularNumber value={formatCurrency(stats.totalBusinessCosts)} />} subtitle="Saídas Totais PJ" icon={<UserCheck className="text-indigo-500" />} />
              <StatCard title="Lucro Real" value={<TabularNumber value={formatCurrency(stats.realProfit)} />} subtitle="Líquido Disponível" icon={<Gem className="text-amber-500" />} color="bg-amber-50/30 border-amber-100" />
              <div className={`p-6 rounded-2xl border ${stats.accountMixLeakage > 5 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'} shadow-sm`}>
                 <div className="flex justify-between items-start"><h3 className="text-slate-500 text-sm font-medium">Vazamento (Leakage)</h3><AlertTriangle className={stats.accountMixLeakage > 5 ? 'text-rose-600' : 'text-slate-400'} size={18} /></div>
                 <div className="mt-4"><span className={`text-2xl font-black ${stats.accountMixLeakage > 5 ? 'text-rose-700' : 'text-slate-900'}`}>{stats.accountMixLeakage.toFixed(1)}%</span><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Mistura de Contas</p></div>
              </div>
            </div>

            {/* Gráficos Principais */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Gráfico de Barras - Fluxo Mensal */}
              <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <h3 className="font-bold text-lg mb-8 flex items-center gap-2 text-slate-800"><BarChart3 className="text-indigo-600" /> Fluxo de Caixa Mensal</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `R$${v/1000}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="Receita" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Custos" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Pizza - Raio-X Financeiro */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800"><PieChartIcon className="text-indigo-600" /> Raio-X Financeiro</h3>
                <div className="h-[280px] w-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={xRayChartData} 
                        innerRadius={70} 
                        outerRadius={100} 
                        paddingAngle={5} 
                        dataKey="value" 
                        isAnimationActive={true}
                      >
                        {xRayChartData.map((entry, index) => (
                          <Cell key={`cell-xray-${index}`} fill={entry.color} stroke="none" className="outline-none" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend verticalAlign="bottom" align="center" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 text-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lucro Disponível</p>
                   <p className="text-xl font-black text-emerald-600">{formatCurrency(stats.realProfit)}</p>
                </div>
              </div>
            </div>

            {/* Metas e Categorias */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <GoalCard progress={stats.totalRevenue} target={ANNUAL_GOAL} />
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={100} /></div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Próxima Recompensa</p>
                  <h3 className="text-2xl font-black mb-1">{nextMilestone.reward}</h3>
                  <div className="w-full bg-white/10 h-2 rounded-full mt-4 overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.totalRevenue / nextMilestone.target) * 100)}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Categorias de Gastos */}
              <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800"><ShoppingBag className="text-indigo-600" /> Gastos por Categoria</h3>
                  <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">Rateios PJ Incluídos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                   <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryChartData} dataKey="value" innerRadius={60} outerRadius={85} paddingAngle={2}>
                            {categoryChartData.map((_, index) => (
                              <Cell key={`cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="space-y-3">
                      {categoryChartData.slice(0, 5).map((cat, idx) => (
                        <div key={cat.name} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}></div>
                             <span className="text-xs font-semibold text-slate-600">{cat.name}</span>
                          </div>
                          <span className="text-xs font-black text-slate-800">{formatCurrency(cat.value)}</span>
                        </div>
                      ))}
                      {categoryChartData.length > 5 && (
                        <p className="text-[10px] text-slate-400 italic text-center pt-2">Mais {categoryChartData.length - 5} categorias secundárias</p>
                      )}
                   </div>
                </div>
              </div>
            </div>

            {/* Dívidas e Rateio Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><CreditCard className="text-rose-500" size={18} /> Resumo de Dívidas</h3>
                    <button onClick={() => setActiveTab('debts')} className="text-[10px] font-black text-indigo-600 uppercase">Gerenciar</button>
                  </div>
                  <div className="space-y-5">
                    {debts.slice(0, 3).map(d => (
                       <div key={d.id} className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-slate-600"><span>{d.description}</span><span>{formatCurrency(d.remainingAmount)}</span></div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner"><div className="bg-rose-500 h-full transition-all duration-700" style={{ width: `${((d.totalAmount - d.remainingAmount) / d.totalAmount) * 100}%` }}></div></div>
                       </div>
                    ))}
                  </div>
               </div>
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><RefreshCcw className="text-blue-500" size={18} /> Rateio de Fixos</h3>
                    <button onClick={() => setActiveTab('fixed-costs')} className="text-[10px] font-black text-indigo-600 uppercase">Configurar</button>
                  </div>
                  <div className="space-y-5">
                    {fixedCosts.slice(0, 3).map(c => (
                       <div key={c.id} className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-slate-600"><span>{c.description}</span><span className="text-blue-600">{c.businessPercentage*100}%</span></div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner"><div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${c.businessPercentage*100}%` }}></div></div>
                       </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Mantenho as outras abas conforme funcionalidade anterior */}
        {activeTab === 'fixed-costs' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center">
              <div><h2 className="text-2xl font-bold">Custos Fixos & Rateio</h2><p className="text-sm text-slate-500">Despesas recorrentes do seu dia a dia (Aluguel, Internet, etc).</p></div>
              <button onClick={() => { setEditingId(null); setShowFixedCostModal(true); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg"><PlusCircle size={18} /> Novo Custo Fixo</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fixedCosts.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Home size={20} /></div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditFixedCost(c)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => handleDeleteItem('fixed', c.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                   </div>
                   <h4 className="font-bold text-slate-800 text-lg">{c.description}</h4>
                   <div className="mt-4 space-y-3">
                      <div className="flex justify-between text-xs"><span>Total Mensal</span><span className="font-bold tabular-nums">{formatCurrency(c.totalAmount)}</span></div>
                      <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden"><div className="bg-blue-500 h-full" style={{ width: `${c.businessPercentage * 100}%` }}></div></div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <div><p className="text-[9px] uppercase font-black text-slate-400">Peso Empresa</p><p className="text-sm font-black text-blue-700 tabular-nums">{formatCurrency(c.totalAmount * c.businessPercentage)}</p></div>
                        <div className="text-right"><p className="text-[9px] uppercase font-black text-slate-400">Rateio</p><p className="text-sm font-black text-slate-500">{c.businessPercentage * 100}%</p></div>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Fluxo de Caixa Estratégico</h2><button onClick={() => { setEditingId(null); setShowTransactionModal(true); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg"><PlusCircle size={18} /> Novo Lançamento</button></div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"><table className="w-full text-left min-w-[700px]"><thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b"><tr><th className="p-6">Data</th><th className="p-6">Descrição</th><th className="p-6 text-right">Valor</th><th className="p-6 text-center">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{transactions.map(t => (<tr key={t.id} className="hover:bg-slate-50/50 transition-colors group"><td className="p-6 text-xs text-slate-400 tabular-nums">{new Date(t.date).toLocaleDateString('pt-BR')}</td><td className="p-6 font-bold text-slate-800">{t.description}</td><td className={`p-6 text-right font-black tabular-nums ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-900'}`}>{t.type === TransactionType.INCOME ? '+' : ''} {formatCurrency(t.amount)}</td><td className="p-6 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => handleEditTransaction(t)} className="p-2 text-slate-300 hover:text-indigo-600"><Pencil size={16} /></button><button onClick={() => handleDeleteItem('tx', t.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button></div></td></tr>))}</tbody></table></div>
           </div>
        )}

        {activeTab === 'taxes' && (
           <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Impostos Pagos</h2><button onClick={() => { setEditingId(null); setShowTaxModal(true); }} className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg">Registrar Guia Paga</button></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Pago (Ano)" value={<TabularNumber value={formatCurrency(stats.totalTaxesPaid)} />} icon={<Landmark className="text-amber-600" />} />
                <StatCard title="Provisionado" value={<TabularNumber value={formatCurrency(stats.taxProvision)} />} subtitle="6% Estimativa" icon={<FileText className="text-slate-400" />} />
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto"><table className="w-full text-left min-w-[700px]"><thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b"><tr><th className="p-6">Data</th><th className="p-6">Imposto</th><th className="p-6 text-right">Valor</th><th className="p-6 text-center">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{taxPayments.map(p => (<tr key={p.id} className="hover:bg-slate-50/50 transition-colors group"><td className="p-6 text-xs text-slate-400 tabular-nums">{new Date(p.date).toLocaleDateString('pt-BR')}</td><td className="p-6 font-bold">{p.taxName}</td><td className="p-6 text-right font-black text-amber-600 tabular-nums">{formatCurrency(p.amount)}</td><td className="p-6 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => handleEditTax(p)} className="p-2 text-slate-300 hover:text-indigo-600"><Pencil size={16} /></button><button onClick={() => handleDeleteItem('tax', p.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button></div></td></tr>))}</tbody></table></div>
           </div>
        )}

        {activeTab === 'debts' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Dívidas & Parcelados</h2><button onClick={() => { setEditingId(null); setShowDebtModal(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg">Cadastrar Dívida</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {debts.map(d => {
                const progValue = ((d.totalAmount - d.remainingAmount) / (d.totalAmount || 1)) * 100;
                const prog = Math.max(0, Math.min(100, isNaN(progValue) ? 0 : progValue));
                return (
                  <div key={d.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 group relative">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1"><h4 className="font-bold text-slate-800 text-xl tracking-tight">{d.description}</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">Quitação</p></div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditDebt(d)} className="text-slate-300 hover:text-indigo-600 transition-colors p-2 hover:bg-indigo-50 rounded-xl"><Pencil size={18} /></button>
                        <button onClick={() => handleDeleteItem('debt', d.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl"><Trash2 size={20} /></button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-end"><span className="text-[11px] font-black text-slate-500 uppercase">Estado</span><span className="text-sm font-black text-indigo-600 tabular-nums">{prog.toFixed(0)}%</span></div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner"><div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-700" style={{ width: `${prog}%` }}></div></div>
                    </div>
                    <div className="bg-rose-50/70 p-5 rounded-[1.5rem] border border-rose-100/50 text-center"><span className="text-[10px] text-rose-600 font-black uppercase tracking-widest opacity-70">Saldo Devedor</span><span className="block text-2xl font-black text-rose-600 tabular-nums">{formatCurrency(d.remainingAmount)}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'buckets' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div><h2 className="text-2xl font-bold text-slate-900">Ordenador de Verbas</h2><p className="text-sm text-slate-500">Sugestão de distribuição do lucro real: <span className="font-bold text-indigo-600 tabular-nums">{formatCurrency(stats.realProfit)}</span></p></div>
              <div className="bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 font-bold text-xs border border-emerald-100 flex items-center gap-2"><ShieldCheck size={16} /> Pró-labore, Impostos e Rateios já pagos</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bucketDistribution.map(b => (
                <div key={b.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between group overflow-hidden relative">
                   <div className="absolute -top-10 -right-10 w-32 h-32 opacity-5" style={{ backgroundColor: b.color, borderRadius: '100%' }}></div>
                   <div className="flex justify-between items-start mb-6"><div className="p-4 rounded-2xl" style={{ backgroundColor: `${b.color}20`, color: b.color }}>{getBucketIcon(b.icon)}</div><span className="text-[11px] font-black px-3 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-100 tabular-nums">{b.percentage * 100}%</span></div>
                   <div><h4 className="font-bold text-slate-800 text-lg mb-1">{b.name}</h4><p className="text-3xl font-black tracking-tight tabular-nums" style={{ color: b.color }}>{formatCurrency(b.value)}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modals */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-150">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h2><button onClick={() => { setShowTransactionModal(false); setEditingId(null); }}><X /></button></div>
              <div className="p-8 space-y-6">
                <div className="flex bg-slate-50 p-1.5 rounded-2xl"><button onClick={() => setTxFormData({...txFormData, type: TransactionType.INCOME})} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${txFormData.type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Entrada</button><button onClick={() => setTxFormData({...txFormData, type: TransactionType.EXPENSE})} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${txFormData.type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Saída</button></div>
                <input type="text" placeholder="Descrição" value={txFormData.description} onChange={e => setTxFormData({...txFormData, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={txFormData.amount} onChange={e => setTxFormData({...txFormData, amount: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black" placeholder="Valor (R$)" />
                  <select value={txFormData.category} onChange={e => setTxFormData({...txFormData, category: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm">
                    <option value="Serviços">Vendas/Serviços</option>
                    <option value="Software">Software/SaaS</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Infra">Infra/Setup</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <select value={txFormData.nature} onChange={e => setTxFormData({...txFormData, nature: e.target.value as TransactionNature})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm">
                  <option value={TransactionNature.BUSINESS}>Empresa (PJ)</option>
                  <option value={TransactionNature.PERSONAL}>Pessoal</option>
                  <option value={TransactionNature.MIXED}>Misto (Rateio)</option>
                </select>
                <button onClick={handleSaveTransaction} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl">Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {showFixedCostModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-150">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Custo Fixo' : 'Novo Custo Fixo'}</h2><button onClick={() => { setShowFixedCostModal(false); setEditingId(null); }}><X /></button></div>
              <div className="p-8 space-y-6">
                <input type="text" placeholder="Descrição (Ex: Aluguel)" value={fixedCostFormData.description} onChange={e => setFixedCostFormData({...fixedCostFormData, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Valor Total</label><input type="text" value={fixedCostFormData.totalAmount} onChange={e => setFixedCostFormData({...fixedCostFormData, totalAmount: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black" placeholder="R$ 0,00" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2">% Empresa</label><input type="number" value={fixedCostFormData.businessPercentage} onChange={e => setFixedCostFormData({...fixedCostFormData, businessPercentage: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black" placeholder="Ex: 20" /></div>
                </div>
                <select value={fixedCostFormData.category} onChange={e => setFixedCostFormData({...fixedCostFormData, category: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm">
                    <option value="Habitação">Habitação (Aluguel/Condo)</option>
                    <option value="Infra">Infra (Internet/Nuvem)</option>
                    <option value="Utilidades">Utilidades (Luz/Água)</option>
                    <option value="Assinaturas">Assinaturas Mensais</option>
                </select>
                <button onClick={handleSaveFixedCost} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl">Salvar</button>
              </div>
            </div>
          </div>
        )}

        {showTaxModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-150">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Imposto' : 'Registrar Imposto'}</h2><button onClick={() => { setShowTaxModal(false); setEditingId(null); }}><X /></button></div>
              <div className="p-8 space-y-6"><select value={taxFormData.taxName} onChange={e => setTaxFormData({...taxFormData, taxName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"><option value="DAS - Simples Nacional">DAS - Simples Nacional</option><option value="ISS Municipal">ISS Municipal</option><option value="INSS - Pró-labore">INSS - Pró-labore</option></select><div className="grid grid-cols-2 gap-4"><input type="text" value={taxFormData.amount} onChange={e => setTaxFormData({...taxFormData, amount: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black" placeholder="Valor" /><input type="text" placeholder="MM/AA" value={taxFormData.period} onChange={e => setTaxFormData({...taxFormData, period: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-center" /></div><button onClick={handleSaveTax} className="w-full py-5 bg-amber-600 text-white font-black rounded-2xl">Confirmar</button></div>
            </div>
          </div>
        )}

        {showDebtModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-150">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Dívida' : 'Nova Dívida'}</h2><button onClick={() => { setShowDebtModal(false); setEditingId(null); }}><X /></button></div>
              <div className="p-8 space-y-5"><input type="text" placeholder="Descrição" value={debtFormData.description} onChange={e => setDebtFormData({...debtFormData, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium" /><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Total</label><input type="text" placeholder="Ex: 80.000,00" value={debtFormData.totalAmount} onChange={e => setDebtFormData({...debtFormData, totalAmount: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" /></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Saldo Atual</label><input type="text" placeholder="Ex: 32.500,00" value={debtFormData.remainingAmount} onChange={e => setDebtFormData({...debtFormData, remainingAmount: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black" /></div></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Valor da Parcela</label><input type="text" placeholder="Ex: 1.200,00" value={debtFormData.installmentValue} onChange={e => setDebtFormData({...debtFormData, installmentValue: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" /></div><button onClick={handleSaveDebt} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl">Salvar</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
