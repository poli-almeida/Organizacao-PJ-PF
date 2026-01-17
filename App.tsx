
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
  Flame,
  Crown
} from 'lucide-react';
import { 
  PieChart,
  Pie,
  Cell,
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

import { 
  Transaction, 
  TransactionType, 
  TransactionNature, 
  Debt, 
  TaxPayment,
} from './types.ts';
import { 
  INITIAL_TRANSACTIONS, 
  INITIAL_DEBTS, 
  ANNUAL_GOAL, 
  DEFAULT_ALLOCATION_RATE,
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
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'taxes' | 'debts' | 'buckets'>('dashboard');

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
    return saved ? JSON.parse(saved) : [];
  });
  
  const [allocationRate, setAllocationRate] = useState(DEFAULT_ALLOCATION_RATE);
  const [proLabore, setProLabore] = useState(() => Number(localStorage.getItem('hana_prolabore')) || DEFAULT_PRO_LABORE);
  const [taxRate] = useState(0.06);

  const [tip, setTip] = useState<string>('Clique para insight do CFO...');
  const [isTipLoading, setIsTipLoading] = useState(false);
  
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);

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

  useEffect(() => { localStorage.setItem('hana_txs', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('hana_debts', JSON.stringify(debts)); }, [debts]);
  useEffect(() => { localStorage.setItem('hana_tax_paid', JSON.stringify(taxPayments)); }, [taxPayments]);
  useEffect(() => { localStorage.setItem('hana_prolabore', proLabore.toString()); }, [proLabore]);

  const stats = useMemo(() => {
    let revenue = 0;
    let businessOperatingCosts = 0;
    let personalLeakedInBusiness = 0;

    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME) revenue += t.amount;
      else {
        if (t.nature === TransactionNature.BUSINESS) businessOperatingCosts += t.amount;
        else if (t.nature === TransactionNature.PERSONAL) personalLeakedInBusiness += t.amount;
        else if (t.nature === TransactionNature.MIXED) businessOperatingCosts += t.amount * allocationRate;
      }
    });

    const totalTaxesPaid = taxPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const totalBusinessCosts = businessOperatingCosts + proLabore + totalTaxesPaid;
    const realProfitValue = revenue - totalBusinessCosts;

    return {
      totalRevenue: revenue,
      totalBusinessCosts,
      taxProvision: revenue * taxRate,
      totalTaxesPaid,
      proLabore,
      realProfit: Math.max(0, realProfitValue),
      accountMixLeakage: totalBusinessCosts > 0 ? (personalLeakedInBusiness / (totalBusinessCosts + personalLeakedInBusiness)) * 100 : 0,
      goalProgress: (revenue / ANNUAL_GOAL) * 100,
      personalLeakedInBusiness
    };
  }, [transactions, taxPayments, allocationRate, taxRate, proLabore]);

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
    else { setAuthError(true); setPinInput(''); setTimeout(() => setAuthError(false), 2000); }
  }, [pinInput]);

  const handleFetchTip = useCallback(async () => {
    if (isTipLoading) return;
    setIsTipLoading(true);
    const newTip = await getFinancialTip(stats as any, ANNUAL_GOAL);
    setTip(newTip);
    setIsTipLoading(false);
  }, [stats, isTipLoading]);

  // Transações
  const handleEditTransaction = (tx: Transaction) => {
    setEditingId(tx.id);
    setTxFormData({
      description: tx.description,
      amount: tx.amount.toString().replace('.', ','),
      category: tx.category,
      type: tx.type,
      nature: tx.nature,
      date: tx.date
    });
    setShowTransactionModal(true);
  };

  const handleSaveTransaction = useCallback(() => {
    const amount = parseSmartNumber(txFormData.amount);
    if (!txFormData.description || !amount) return;
    
    if (editingId) {
      setTransactions(prev => prev.map(t => t.id === editingId ? { ...t, ...txFormData, amount } : t));
    } else {
      setTransactions(prev => [{ ...txFormData, amount, id: Math.random().toString(36).substr(2, 9) } as Transaction, ...prev]);
    }
    
    setShowTransactionModal(false);
    setEditingId(null);
    setTxFormData({ description: '', amount: '', category: 'Vendas', type: TransactionType.INCOME, nature: TransactionNature.BUSINESS, date: new Date().toISOString().split('T')[0] });
  }, [txFormData, editingId]);

  const handleDeleteTransaction = useCallback((id: string) => {
    if (confirm('Excluir este lançamento?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  }, []);

  // Impostos
  const handleEditTax = (tax: TaxPayment) => {
    setEditingId(tax.id);
    setTaxFormData({
      taxName: tax.taxName,
      amount: tax.amount.toString().replace('.', ','),
      date: tax.date,
      period: tax.period
    });
    setShowTaxModal(true);
  };

  const handleSaveTax = useCallback(() => {
     const amount = parseSmartNumber(taxFormData.amount);
     if (!amount) return;
     
     if (editingId) {
       setTaxPayments(prev => prev.map(t => t.id === editingId ? { ...t, ...taxFormData, amount } : t));
     } else {
       setTaxPayments(prev => [{ ...taxFormData, amount, id: Math.random().toString(36).substr(2, 9) } as TaxPayment, ...prev]);
     }
     
     setShowTaxModal(false);
     setEditingId(null);
     setTaxFormData({ taxName: 'DAS - Simples Nacional', amount: '', date: new Date().toISOString().split('T')[0], period: '' });
  }, [taxFormData, editingId]);

  const handleDeleteTax = useCallback((id: string) => {
    if (confirm('Excluir registro de imposto?')) {
      setTaxPayments(prev => prev.filter(t => t.id !== id));
    }
  }, []);

  // Dívidas
  const handleEditDebt = (debt: Debt) => {
    setEditingId(debt.id);
    setDebtFormData({
      description: debt.description,
      totalAmount: debt.totalAmount.toString().replace('.', ','),
      remainingAmount: debt.remainingAmount.toString().replace('.', ','),
      installmentValue: debt.installmentValue.toString().replace('.', ',')
    });
    setShowDebtModal(true);
  };

  const handleSaveDebt = useCallback(() => {
    const total = parseSmartNumber(debtFormData.totalAmount);
    const remaining = parseSmartNumber(debtFormData.remainingAmount);
    const installment = parseSmartNumber(debtFormData.installmentValue);
    
    if (!debtFormData.description || !total) return;
    
    if (editingId) {
      setDebts(prev => prev.map(d => d.id === editingId ? { 
        ...d, 
        ...debtFormData, 
        totalAmount: total, 
        remainingAmount: Math.max(0, Math.min(remaining, total)),
        installmentValue: installment
      } : d));
    } else {
      setDebts(prev => [{ 
        ...debtFormData, 
        totalAmount: total, 
        remainingAmount: Math.max(0, Math.min(remaining, total)),
        installmentValue: installment,
        id: Math.random().toString(36).substr(2, 9) 
      } as Debt, ...prev]);
    }
    
    setShowDebtModal(false);
    setEditingId(null);
    setDebtFormData({ description: '', totalAmount: '', remainingAmount: '', installmentValue: '' });
  }, [debtFormData, editingId]);

  const handleDeleteDebt = useCallback((id: string) => {
    if (confirm('Excluir esta dívida?')) {
      setDebts(prev => prev.filter(d => d.id !== id));
    }
  }, []);

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
          <div className="w-20 h-20 bg-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="text-indigo-400 w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 italic">Hana Finance</h1>
          <p className="text-slate-400 text-sm mb-8">Ordenador Estratégico de Elite</p>
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
            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2">
              <Lightbulb size={16} /> <span className="text-[10px] uppercase tracking-widest">IA Advisor</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-80 mb-4">{isTipLoading ? 'Consultando IA...' : tip}</p>
            <button onClick={handleFetchTip} disabled={isTipLoading} className="w-full py-2 bg-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50">GERAR INSIGHT</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-12 space-y-10 overflow-x-hidden">
        {stats.accountMixLeakage > 3 && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
            <div className="bg-rose-500 p-2 rounded-xl text-white shadow-lg shadow-rose-200"><AlertTriangle size={20} /></div>
            <div className="flex-1">
              <h4 className="text-rose-900 font-bold text-sm">Alerta de Vazamento</h4>
              <p className="text-rose-700 text-xs font-medium">Empresa pagou <TabularNumber value={formatCurrency(stats.personalLeakedInBusiness)} /> de gastos pessoais.</p>
            </div>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-200">
                {level.current}
              </div>
              <div className="absolute -top-2 -right-2 bg-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded-full text-slate-900 uppercase">LVL</div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{level.title}</h1>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Hana Finance Strategic Overview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-white border p-3 rounded-2xl flex items-center gap-4 shadow-sm border-slate-100">
                <div className="text-center px-2">
                   <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Pró-labore Fixo</p>
                   <input 
                    type="number" 
                    value={proLabore} 
                    onChange={e => setProLabore(Number(e.target.value))} 
                    className="w-24 text-sm font-black text-indigo-600 outline-none bg-transparent tabular-nums" 
                   />
                </div>
                <div className="w-[1px] h-8 bg-slate-100"></div>
                <div className="text-center px-2">
                   <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Taxa Rateio</p>
                   <span className="text-sm font-black text-slate-700 tabular-nums">{allocationRate*100}%</span>
                </div>
             </div>
             <button onClick={() => { setEditingId(null); setShowTransactionModal(true); }} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-600/30 hover:scale-105 transition-all"><PlusCircle size={24} /></button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Receita Bruta" value={<TabularNumber value={formatCurrency(stats.totalRevenue)} />} icon={<Wallet className="text-emerald-500" />} />
              <StatCard title="Pró-labore" value={<TabularNumber value={formatCurrency(stats.proLabore)} />} subtitle="Seu Salário Fixo" icon={<UserCheck className="text-indigo-500" />} />
              <StatCard title="Lucro Líquido" value={<TabularNumber value={formatCurrency(stats.realProfit)} />} subtitle="Para os Baldes" icon={<Gem className="text-amber-500" />} color="bg-amber-50/30 border-amber-100" />
              <div className={`p-6 rounded-2xl border ${stats.accountMixLeakage > 5 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'} flex flex-col justify-between shadow-sm`}>
                 <div className="flex justify-between items-start">
                    <h3 className="text-slate-500 text-sm font-medium">Leakage (Furo)</h3>
                    <AlertTriangle className={stats.accountMixLeakage > 5 ? 'text-rose-600' : 'text-slate-400'} size={18} />
                 </div>
                 <div className="mt-4">
                    <span className={`text-2xl font-black ${stats.accountMixLeakage > 5 ? 'text-rose-700' : 'text-slate-900'}`}>
                      <TabularNumber value={stats.accountMixLeakage.toFixed(1)} />%
                    </span>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Meta: Abaixo de 2%</p>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-10">
              <div className="space-y-6">
                <GoalCard progress={stats.totalRevenue} target={ANNUAL_GOAL} />
                
                <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform"><Trophy size={120} /></div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Próxima Conquista</p>
                    <h3 className="text-2xl font-black mb-1">{nextMilestone.reward}</h3>
                    <p className="text-slate-400 text-xs mb-6">Desbloqueia ao atingir <TabularNumber value={formatCurrency(nextMilestone.target)} /></p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase">
                        <span>Progresso</span>
                        <span><TabularNumber value={Math.min(100, (stats.totalRevenue / nextMilestone.target) * 100).toFixed(0)} />%</span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full transition-all duration-700" style={{ width: `${Math.min(100, (stats.totalRevenue / nextMilestone.target) * 100)}%` }}></div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium italic">Faltam <TabularNumber value={formatCurrency(Math.max(0, nextMilestone.target - stats.totalRevenue))} /> para o seu presente!</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-800 mb-8 flex items-center gap-2 tracking-tight"><Crown className="text-amber-500" size={20} /> Caminho da Vitória</h3>
                  <div className="space-y-8 relative">
                    <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-100"></div>
                    {MILESTONES.map((m, idx) => {
                      const isUnlocked = stats.totalRevenue >= m.target;
                      return (
                        <div key={idx} className={`relative flex items-center gap-6 transition-all ${isUnlocked ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 border-4 ${isUnlocked ? 'bg-indigo-600 border-indigo-100 text-white' : 'bg-white border-slate-100 text-slate-300'}`}>
                            {isUnlocked ? <CheckCircle2 size={16} /> : <span>{idx + 1}</span>}
                          </div>
                          <div className="flex-1 text-sm font-bold text-slate-800">{m.reward}</div>
                          <div className="text-xl">{m.icon}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <h3 className="font-bold text-lg mb-8 flex items-center gap-2"><PieChartIcon className="text-indigo-600" /> Raio-X Financeiro</h3>
                  <div className="h-[320px] w-full" style={{ minHeight: '320px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={[
                            { name: 'Impostos', value: stats.totalTaxesPaid, color: '#f59e0b' },
                            { name: 'Pró-labore', value: stats.proLabore, color: '#6366f1' },
                            { name: 'Custos Op', value: Math.max(0, stats.totalBusinessCosts - stats.proLabore - stats.totalTaxesPaid), color: '#94a3b8' },
                            { name: 'Lucro Líquido', value: stats.realProfit, color: '#10b981' },
                            { name: 'Furo Pessoal', value: stats.personalLeakedInBusiness, color: '#ef4444' }
                          ].filter(d => d.value > 0)} 
                          innerRadius={80} 
                          outerRadius={110} 
                          paddingAngle={8} 
                          dataKey="value"
                          isAnimationActive={false}
                        >
                          {[0,1,2,3,4,5].map((_, i) => <Cell key={i} className="outline-none" />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 mb-1 uppercase">Op. (PJ)</p>
                        <p className="text-sm font-black text-slate-700"><TabularNumber value={formatCurrency(Math.max(0, stats.totalBusinessCosts - stats.totalTaxesPaid - stats.proLabore))} /></p>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <p className="text-[9px] font-black text-indigo-400 mb-1 uppercase">Saídas Totais</p>
                        <p className="text-sm font-black text-indigo-700"><TabularNumber value={formatCurrency(stats.totalBusinessCosts)} /></p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-400 mb-1 uppercase">Margem Real</p>
                        <p className="text-sm font-black text-emerald-700"><TabularNumber value={stats.totalRevenue > 0 ? ((stats.realProfit / stats.totalRevenue) * 100).toFixed(1) : '0.0'} />%</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><CreditCard className="text-rose-500" size={20} /> Dívidas</h3>
                         <button onClick={() => setActiveTab('debts')} className="text-[10px] font-bold text-indigo-600 uppercase hover:underline">Ver Tudo</button>
                      </div>
                      <div className="space-y-5">
                         {debts.slice(0, 3).map(d => (
                            <div key={d.id} className="space-y-1.5 group">
                               <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-slate-700">{d.description}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black text-rose-500 tabular-nums"><TabularNumber value={formatCurrency(d.remainingAmount)} /></span>
                                    <button onClick={() => handleEditDebt(d)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-500 transition-all"><Pencil size={12} /></button>
                                  </div>
                               </div>
                               <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-rose-500 h-full" style={{ width: `${Math.max(0, Math.min(100, ((d.totalAmount - d.remainingAmount) / (d.totalAmount || 1)) * 100))}%` }}></div>
                                </div>
                            </div>
                         ))}
                         {debts.length === 0 && <p className="text-xs text-slate-400 italic">Limpo de dívidas!</p>}
                      </div>
                   </div>

                   <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Gem className="text-amber-500" size={20} /> Baldes</h3>
                         <button onClick={() => setActiveTab('buckets')} className="text-[10px] font-bold text-indigo-600 uppercase hover:underline">Distribuir</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         {bucketDistribution.slice(0, 4).map(b => (
                            <div key={b.id} className="p-3 rounded-xl border border-slate-50 bg-slate-50/30">
                               <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{b.name.split(' ')[0]}</p>
                               <p className="text-xs font-black text-slate-800 tabular-nums"><TabularNumber value={formatCurrency(b.value)} /></p>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab content: Fluxo de Caixa */}
        {activeTab === 'transactions' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <h2 className="text-2xl font-bold">Fluxo de Caixa Estratégico</h2>
                 <button onClick={() => { setEditingId(null); setShowTransactionModal(true); }} className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all">
                    <PlusCircle size={18} /> Novo Lançamento
                 </button>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                    <tr><th className="p-6">Data</th><th className="p-6">Descrição</th><th className="p-6">Natureza</th><th className="p-6 text-right">Valor</th><th className="p-6 text-center">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-6 text-xs text-slate-400 tabular-nums">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-6 font-bold text-slate-800">{t.description}</td>
                        <td className="p-6">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${t.nature === TransactionNature.BUSINESS ? 'border-indigo-100 text-indigo-600' : t.nature === TransactionNature.PERSONAL ? 'border-rose-100 text-rose-600' : 'border-amber-100 text-amber-600'}`}>
                            {t.nature === TransactionNature.BUSINESS ? 'Empresa' : t.nature === TransactionNature.PERSONAL ? 'Pessoal (Leak!)' : 'Misto'}
                          </span>
                        </td>
                        <td className={`p-6 text-right font-black tabular-nums ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-900'}`}>{t.type === TransactionType.INCOME ? '+' : ''} {formatCurrency(t.amount)}</td>
                        <td className="p-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEditTransaction(t)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Pencil size={16} /></button>
                            <button onClick={() => handleDeleteTransaction(t.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}

        {/* Tab content: Impostos */}
        {activeTab === 'taxes' && (
           <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold">Saúde Tributária</h2>
                <button onClick={() => { setEditingId(null); setShowTaxModal(true); }} className="w-full sm:w-auto bg-amber-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all">Registrar Guia Paga</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Pago (Ano)" value={<TabularNumber value={formatCurrency(stats.totalTaxesPaid)} />} icon={<Landmark className="text-amber-600" />} />
                <StatCard title="Provisionado" value={<TabularNumber value={formatCurrency(stats.taxProvision)} />} subtitle="Estimativa 6%" icon={<FileText className="text-slate-400" />} />
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Conformidade</p>
                   <div className="text-2xl font-black text-indigo-600 tabular-nums">
                     <TabularNumber value={stats.taxProvision > 0 ? ((stats.totalTaxesPaid / stats.taxProvision) * 100).toFixed(0) : '0'} />%
                   </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                 <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                      <tr><th className="p-6">Data</th><th className="p-6">Imposto</th><th className="p-6">Competência</th><th className="p-6 text-right">Valor</th><th className="p-6 text-center">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {taxPayments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-6 text-xs text-slate-400 tabular-nums">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                          <td className="p-6 font-bold">{p.taxName}</td>
                          <td className="p-6 text-slate-500 text-sm">{p.period}</td>
                          <td className="p-6 text-right font-black text-amber-600 tabular-nums">{formatCurrency(p.amount)}</td>
                          <td className="p-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleEditTax(p)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Pencil size={16} /></button>
                              <button onClick={() => handleDeleteTax(p.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* Tab content: Dívidas */}
        {activeTab === 'debts' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-2xl font-bold">Gestão de Dívidas & Parcelados</h2>
              <button onClick={() => { setEditingId(null); setShowDebtModal(true); }} className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all">Cadastrar Dívida</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {debts.map(d => {
                const progValue = ((d.totalAmount - d.remainingAmount) / (d.totalAmount || 1)) * 100;
                const prog = Math.max(0, Math.min(100, isNaN(progValue) ? 0 : progValue));
                return (
                  <div key={d.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 hover:border-indigo-200 transition-all group relative">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-xl tracking-tight">{d.description}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">Quitação</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditDebt(d)} className="text-slate-300 hover:text-indigo-600 transition-colors p-2 hover:bg-indigo-50 rounded-xl"><Pencil size={18} /></button>
                        <button onClick={() => handleDeleteDebt(d.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl"><Trash2 size={20} /></button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[11px] font-black text-slate-500 uppercase">Estado</span>
                        <span className="text-sm font-black text-indigo-600 tabular-nums">{prog.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-700" style={{ width: `${prog}%` }}></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                       <div className="space-y-1">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Total</p>
                          <p className="text-sm font-bold text-slate-600 tabular-nums"><TabularNumber value={formatCurrency(d.totalAmount)} /></p>
                       </div>
                       <div className="space-y-1 text-right">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Parcela</p>
                          <p className="text-sm font-bold text-slate-600 tabular-nums"><TabularNumber value={formatCurrency(d.installmentValue)} /></p>
                       </div>
                    </div>
                    <div className="bg-rose-50/70 p-5 rounded-[1.5rem] border border-rose-100/50 text-center">
                        <span className="text-[10px] text-rose-600 font-black uppercase tracking-widest opacity-70">Saldo Devedor</span>
                        <span className="block text-2xl font-black text-rose-600 tabular-nums"><TabularNumber value={formatCurrency(d.remainingAmount)} /></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab content: Buckets */}
        {activeTab === 'buckets' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Ordenador Estratégico de Verbas</h2>
                <p className="text-sm text-slate-500">Distribuição recomendada do lucro real: <span className="font-bold text-indigo-600 tabular-nums"><TabularNumber value={formatCurrency(stats.realProfit)} /></span></p>
              </div>
              <div className="bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 font-bold text-xs border border-emerald-100 flex items-center gap-2"><ShieldCheck size={16} /> Pró-labore e Impostos já provisionados</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bucketDistribution.map(b => (
                <div key={b.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between group overflow-hidden relative">
                   <div className="absolute -top-10 -right-10 w-32 h-32 opacity-5 transition-transform group-hover:scale-150" style={{ backgroundColor: b.color, borderRadius: '100%' }}></div>
                   <div className="flex justify-between items-start mb-6">
                      <div className="p-4 rounded-2xl group-hover:scale-110 transition-transform shadow-md" style={{ backgroundColor: `${b.color}20`, color: b.color }}>{getBucketIcon(b.icon)}</div>
                      <span className="text-[11px] font-black px-3 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-100 tabular-nums">{b.percentage * 100}%</span>
                   </div>
                   <div>
                      <h4 className="font-bold text-slate-800 text-lg mb-1">{b.name}</h4>
                      <p className="text-3xl font-black tracking-tight tabular-nums" style={{ color: b.color }}><TabularNumber value={formatCurrency(b.value)} /></p>
                   </div>
                   <div className="mt-8 pt-6 border-t border-slate-50 opacity-80 italic text-[11px] text-slate-500">
                        {b.id === 'reinvest' && 'Este é o motor da Hana Strategic. Reinvista para crescer.'}
                        {b.id === 'lazer' && 'Sua recompensa por ser disciplinado. Curta sua viagem!'}
                        {b.id === 'imagem' && 'Invista em sua presença e autoridade no mercado.'}
                        {b.id === 'equip' && 'Setup de alta performance para produtividade elite.'}
                        {b.id === 'doar' && 'Contribua para o mundo. O transbordo gera riqueza.'}
                        {b.id === 'gastar' && 'Liberdade total. Gasto livre sem culpa.'}
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modals */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-150">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h2><button onClick={() => { setShowTransactionModal(false); setEditingId(null); }} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X /></button></div>
              <div className="p-8 space-y-6">
                <div className="flex bg-slate-50 p-1.5 rounded-2xl">
                  <button onClick={() => setTxFormData({...txFormData, type: TransactionType.INCOME})} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${txFormData.type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Entrada</button>
                  <button onClick={() => setTxFormData({...txFormData, type: TransactionType.EXPENSE})} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${txFormData.type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Saída</button>
                </div>
                <input type="text" placeholder="Descrição" value={txFormData.description} onChange={e => setTxFormData({...txFormData, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-300 font-medium" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={txFormData.amount} onChange={e => setTxFormData({...txFormData, amount: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black tabular-nums" placeholder="Valor (Ex: 1500,50)" />
                  <select value={txFormData.nature} onChange={e => setTxFormData({...txFormData, nature: e.target.value as TransactionNature})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm">
                    <option value={TransactionNature.BUSINESS}>Empresa (PJ)</option>
                    <option value={TransactionNature.PERSONAL}>Pessoal (Leak!)</option>
                    <option value={TransactionNature.MIXED}>Misto (Rateio)</option>
                  </select>
                </div>
                <button onClick={handleSaveTransaction} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {showTaxModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-150">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Imposto' : 'Registrar Imposto'}</h2><button onClick={() => { setShowTaxModal(false); setEditingId(null); }}><X /></button></div>
              <div className="p-8 space-y-6">
                <select value={taxFormData.taxName} onChange={e => setTaxFormData({...taxFormData, taxName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold">
                  <option value="DAS - Simples Nacional">DAS - Simples Nacional</option>
                  <option value="ISS Municipal">ISS Municipal</option>
                  <option value="INSS - Pró-labore">INSS - Pró-labore</option>
                  <option value="IRPF - Pessoa Física">IRPF - Pessoa Física</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                   <input type="text" value={taxFormData.amount} onChange={e => setTaxFormData({...taxFormData, amount: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black tabular-nums" placeholder="Valor" />
                   <input type="text" placeholder="MM/AA" value={taxFormData.period} onChange={e => setTaxFormData({...taxFormData, period: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium text-center" />
                </div>
                <button onClick={handleSaveTax} className="w-full py-5 bg-amber-600 text-white font-black rounded-2xl shadow-xl hover:bg-amber-700 transition-all">Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {showDebtModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-150">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Dívida' : 'Nova Dívida'}</h2><button onClick={() => { setShowDebtModal(false); setEditingId(null); }}><X /></button></div>
              <div className="p-8 space-y-5">
                <input type="text" placeholder="Descrição (Ex: Notebook)" value={debtFormData.description} onChange={e => setDebtFormData({...debtFormData, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Total</label>
                    <input type="text" placeholder="Ex: 80.000,00" value={debtFormData.totalAmount} onChange={e => setDebtFormData({...debtFormData, totalAmount: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none tabular-nums" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Saldo Atual</label>
                    <input type="text" placeholder="Ex: 32.500,00" value={debtFormData.remainingAmount} onChange={e => setDebtFormData({...debtFormData, remainingAmount: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black tabular-nums" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Valor da Parcela</label>
                  <input type="text" placeholder="Ex: 1.200,00" value={debtFormData.installmentValue} onChange={e => setDebtFormData({...debtFormData, installmentValue: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none tabular-nums" />
                </div>
                <button onClick={handleSaveDebt} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
