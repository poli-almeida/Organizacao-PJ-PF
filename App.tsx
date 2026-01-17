
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb,
  ArrowUpRight,
  Calculator,
  Target,
  Briefcase,
  X,
  Home,
  ShieldCheck,
  Trash2,
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
  ChevronRight,
  Star,
  Flame,
  Crown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { 
  Transaction, 
  TransactionType, 
  TransactionNature, 
  Debt, 
  TaxPayment,
  FinancialStats,
  ProfitBucket 
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

const App: React.FC = () => {
  // Auth & Navigation
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('hana_auth') === 'true');
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'taxes' | 'debts' | 'buckets'>('dashboard');

  // Core Data
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
  
  // Settings
  const [allocationRate, setAllocationRate] = useState(DEFAULT_ALLOCATION_RATE);
  const [proLabore, setProLabore] = useState(() => Number(localStorage.getItem('hana_prolabore')) || DEFAULT_PRO_LABORE);
  const [taxRate, setTaxRate] = useState(0.06);

  // UI States
  const [tip, setTip] = useState<string>('Clique para insight do CFO...');
  const [isTipLoading, setIsTipLoading] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);

  const [txFormData, setTxFormData] = useState<Partial<Transaction>>({
    description: '', amount: 0, category: 'Vendas', type: TransactionType.INCOME, nature: TransactionNature.BUSINESS, date: new Date().toISOString().split('T')[0]
  });

  const [taxFormData, setTaxFormData] = useState<Partial<TaxPayment>>({
    taxName: 'DAS - Simples Nacional', amount: 0, date: new Date().toISOString().split('T')[0], period: ''
  });

  const [debtFormData, setDebtFormData] = useState<Partial<Debt>>({
    description: '', totalAmount: 0, remainingAmount: 0, installmentValue: 0
  });

  // Storage Effects
  useEffect(() => { localStorage.setItem('hana_txs', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('hana_debts', JSON.stringify(debts)); }, [debts]);
  useEffect(() => { localStorage.setItem('hana_tax_paid', JSON.stringify(taxPayments)); }, [taxPayments]);
  useEffect(() => { localStorage.setItem('hana_prolabore', proLabore.toString()); }, [proLabore]);

  // Financial Engine
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
      realProfit: realProfitValue > 0 ? realProfitValue : 0,
      accountMixLeakage: (personalLeakedInBusiness / (totalBusinessCosts + personalLeakedInBusiness || 1)) * 100,
      goalProgress: (revenue / ANNUAL_GOAL) * 100,
      personalLeakedInBusiness
    };
  }, [transactions, taxPayments, allocationRate, taxRate, proLabore]);

  // Gamification Logic
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

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ACCESS_PIN) { setIsAuthenticated(true); localStorage.setItem('hana_auth', 'true'); }
    else { setAuthError(true); setPinInput(''); setTimeout(() => setAuthError(false), 2000); }
  };

  const handleFetchTip = async () => {
    setIsTipLoading(true);
    const newTip = await getFinancialTip(stats as any, ANNUAL_GOAL);
    setTip(newTip);
    setIsTipLoading(false);
  };

  const handleSaveTransaction = () => {
    if (!txFormData.description || !txFormData.amount) return;
    setTransactions([{ ...txFormData, id: Math.random().toString(36).substr(2, 9) } as Transaction, ...transactions]);
    setShowTransactionModal(false);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Deseja excluir este lançamento definitivamente?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const handleSaveTax = () => {
     if (!taxFormData.amount) return;
     setTaxPayments([{...taxFormData, id: Math.random().toString(36).substr(2, 9)} as TaxPayment, ...taxPayments]);
     setShowTaxModal(false);
  };

  const handleDeleteTax = (id: string) => {
    if (confirm('Deseja excluir este registro de imposto?')) {
      setTaxPayments(taxPayments.filter(t => t.id !== id));
    }
  };

  const handleSaveDebt = () => {
    if (!debtFormData.description || !debtFormData.totalAmount) return;
    setDebts([{ ...debtFormData, id: Math.random().toString(36).substr(2, 9) } as Debt, ...debts]);
    setShowDebtModal(false);
  };

  const handleDeleteDebt = (id: string) => {
    if (confirm('Deseja excluir esta dívida?')) {
      setDebts(debts.filter(d => d.id !== id));
    }
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
            <p className="text-[11px] leading-relaxed opacity-80 mb-4">{tip}</p>
            <button onClick={handleFetchTip} className="w-full py-2 bg-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-500 transition-colors">GERAR INSIGHT</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 space-y-10">
        {stats.accountMixLeakage > 3 && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
            <div className="bg-rose-500 p-2 rounded-xl text-white shadow-lg shadow-rose-200"><AlertTriangle size={20} /></div>
            <div className="flex-1">
              <h4 className="text-rose-900 font-bold text-sm">Alerta Crítico: Vazamento Detectado</h4>
              <p className="text-rose-700 text-xs">Você pagou {formatCurrency(stats.personalLeakedInBusiness)} de gastos pessoais via empresa. Corrija a separação!</p>
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
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">{level.title}</h1>
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
                    className="w-24 text-sm font-black text-indigo-600 outline-none bg-transparent" 
                   />
                </div>
                <div className="w-[1px] h-8 bg-slate-100"></div>
                <div className="text-center px-2">
                   <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Taxa Rateio</p>
                   <span className="text-sm font-black text-slate-700">{allocationRate*100}%</span>
                </div>
             </div>
             <button onClick={() => setShowTransactionModal(true)} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-600/30 hover:scale-105 transition-all"><PlusCircle size={24} /></button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Receita Bruta" value={formatCurrency(stats.totalRevenue)} icon={<Wallet className="text-emerald-500" />} />
              <StatCard title="Pró-labore" value={formatCurrency(stats.proLabore)} subtitle="Seu Salário Fixo" icon={<UserCheck className="text-indigo-500" />} />
              <StatCard title="Lucro Líquido" value={formatCurrency(stats.realProfit)} subtitle="Para os Baldes" icon={<Gem className="text-amber-500" />} color="bg-amber-50/30 border-amber-100" />
              <div className={`p-6 rounded-2xl border ${stats.accountMixLeakage > 5 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'} flex flex-col justify-between shadow-sm`}>
                 <div className="flex justify-between items-start">
                    <h3 className="text-slate-500 text-sm font-medium">Leakage (Furo)</h3>
                    <Flame className={stats.accountMixLeakage > 5 ? 'text-rose-600' : 'text-slate-400'} size={18} />
                 </div>
                 <div className="mt-4">
                    <span className={`text-2xl font-black ${stats.accountMixLeakage > 5 ? 'text-rose-700' : 'text-slate-900'}`}>{stats.accountMixLeakage.toFixed(1)}%</span>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Meta: Abaixo de 2%</p>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="space-y-6">
                <GoalCard progress={stats.totalRevenue} target={ANNUAL_GOAL} />
                
                {/* Gamificação: Next Milestone Spotlight */}
                <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                     <Trophy size={120} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Próxima Conquista</p>
                    <h3 className="text-2xl font-black mb-1">{nextMilestone.reward}</h3>
                    <p className="text-slate-400 text-xs mb-6">Desbloqueia ao atingir {formatCurrency(nextMilestone.target)}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase">
                        <span>Progresso</span>
                        <span>{((stats.totalRevenue / nextMilestone.target) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: `${Math.min((stats.totalRevenue / nextMilestone.target) * 100, 100)}%` }}></div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Faltam {formatCurrency(nextMilestone.target - stats.totalRevenue)} para o seu presente!</p>
                    </div>
                  </div>
                </div>

                {/* Gamificação: Success Path (Roadmap) */}
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
                          <div className="flex-1">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</h4>
                            <p className="text-sm font-bold text-slate-800">{m.reward}</p>
                          </div>
                          <div className="text-xl">{m.icon}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <h3 className="font-bold text-lg mb-8 flex items-center gap-2"><PieChartIcon className="text-indigo-600" /> Raio-X Financeiro</h3>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={[
                            { name: 'Impostos', value: stats.totalTaxesPaid, color: '#f59e0b' },
                            { name: 'Pró-labore', value: stats.proLabore, color: '#6366f1' },
                            { name: 'Custos Op', value: stats.totalBusinessCosts - stats.proLabore - stats.totalTaxesPaid, color: '#94a3b8' },
                            { name: 'Lucro Líquido', value: stats.realProfit, color: '#10b981' },
                            { name: 'Furo Pessoal', value: stats.personalLeakedInBusiness, color: '#ef4444' }
                          ]} 
                          innerRadius={90} 
                          outerRadius={120} 
                          paddingAngle={8} 
                          dataKey="value"
                        >
                          {[0,1,2,3,4].map((_, i) => <Cell key={i} fill={['#f59e0b', '#6366f1', '#94a3b8', '#10b981', '#ef4444'][i]} className="hover:opacity-80 transition-opacity outline-none" />)}
                        </Pie>
                        <Tooltip 
                           formatter={(v: number) => formatCurrency(v)} 
                           contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 mb-1 uppercase tracking-widest">Setup & Op (PJ)</p>
                        <p className="text-sm font-black text-slate-700">{formatCurrency(stats.totalBusinessCosts - stats.totalTaxesPaid - stats.proLabore)}</p>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <p className="text-[9px] font-black text-indigo-400 mb-1 uppercase tracking-widest">Saídas Totais</p>
                        <p className="text-sm font-black text-indigo-700">{formatCurrency(stats.totalBusinessCosts)}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-400 mb-1 uppercase tracking-widest">Margem Real</p>
                        <p className="text-sm font-black text-emerald-700">{((stats.realProfit / stats.totalRevenue) * 100 || 0).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Dívidas (Liabilities Summary - DASHBOARD) */}
                   <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><CreditCard className="text-rose-500" size={20} /> Dívidas</h3>
                         <button onClick={() => setActiveTab('debts')} className="text-[10px] font-bold text-indigo-600 uppercase">Ver Tudo</button>
                      </div>
                      <div className="space-y-5">
                         {debts.slice(0, 3).map(d => (
                            <div key={d.id} className="space-y-1.5 group">
                               <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-slate-700">{d.description}</span>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-black text-rose-500">{formatCurrency(d.remainingAmount)}</span>
                                     <button onClick={() => handleDeleteDebt(d.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                                  </div>
                               </div>
                               <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${((d.totalAmount - d.remainingAmount) / d.totalAmount) * 100}%` }}></div>
                                </div>
                            </div>
                         ))}
                         {debts.length === 0 && <p className="text-xs text-slate-400 italic">Limpo de dívidas! Parabéns.</p>}
                      </div>
                   </div>

                   {/* Baldes Preview */}
                   <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Gem className="text-amber-500" size={20} /> Baldes</h3>
                         <button onClick={() => setActiveTab('buckets')} className="text-[10px] font-bold text-indigo-600 uppercase">Distribuir</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         {bucketDistribution.slice(0, 4).map(b => (
                            <div key={b.id} className="p-3 rounded-xl border border-slate-50 bg-slate-50/30">
                               <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{b.name.split(' ')[0]}</p>
                               <p className="text-xs font-black text-slate-800">{formatCurrency(b.value)}</p>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab content for Transactions */}
        {activeTab === 'transactions' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold">Fluxo de Caixa Estratégico</h2>
                 <button onClick={() => setShowTransactionModal(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-transform active:scale-95">
                    <PlusCircle size={18} /> Novo Lançamento
                 </button>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                    <tr><th className="p-6">Data</th><th className="p-6">Descrição</th><th className="p-6">Natureza</th><th className="p-6 text-right">Valor</th><th className="p-6 text-center">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-6 text-xs text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-6 font-bold text-slate-800">{t.description}</td>
                        <td className="p-6">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${t.nature === TransactionNature.BUSINESS ? 'border-indigo-100 text-indigo-600' : t.nature === TransactionNature.PERSONAL ? 'border-rose-100 text-rose-600' : 'border-amber-100 text-amber-600'}`}>
                            {t.nature === TransactionNature.BUSINESS ? 'Empresa' : t.nature === TransactionNature.PERSONAL ? 'Pessoal (Leakage!)' : 'Misto'}
                          </span>
                        </td>
                        <td className={`p-6 text-right font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-900'}`}>{t.type === TransactionType.INCOME ? '+' : ''} {formatCurrency(t.amount)}</td>
                        <td className="p-6 text-center">
                          <button 
                            onClick={() => handleDeleteTransaction(t.id)} 
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length === 0 && <div className="p-20 text-center text-slate-400 italic">Sem registros no momento.</div>}
              </div>
           </div>
        )}

        {/* Tab content for Taxes */}
        {activeTab === 'taxes' && (
           <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Saúde Tributária</h2>
                <button onClick={() => setShowTaxModal(true)} className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-amber-500/20 hover:scale-105 transition-all">Registrar Guia Paga</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Pago (Ano)" value={formatCurrency(stats.totalTaxesPaid)} icon={<Landmark className="text-amber-600" />} />
                <StatCard title="Provisionado" value={formatCurrency(stats.taxProvision)} subtitle="Estimativa 6%" icon={<FileText className="text-slate-400" />} />
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Conformidade</p>
                   <div className="text-2xl font-black text-indigo-600">{((stats.totalTaxesPaid / (stats.taxProvision || 1)) * 100).toFixed(0)}%</div>
                </div>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                      <tr><th className="p-6">Data</th><th className="p-6">Imposto</th><th className="p-6">Competência</th><th className="p-6 text-right">Valor</th><th className="p-6 text-center">Excluir</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {taxPayments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-6 text-xs text-slate-400">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                          <td className="p-6 font-bold">{p.taxName}</td>
                          <td className="p-6 text-slate-500 text-sm">{p.period}</td>
                          <td className="p-6 text-right font-black text-amber-600">{formatCurrency(p.amount)}</td>
                          <td className="p-6 text-center">
                            <button onClick={() => handleDeleteTax(p.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                      {taxPayments.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Nenhum imposto registrado este ano.</td></tr>}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* Tab content for Debts */}
        {activeTab === 'debts' && (
          <div className="space-y-10">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Gestão de Dívidas & Parcelados</h2>
              <button onClick={() => setShowDebtModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95">Cadastrar Dívida</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {debts.map(d => {
                const prog = ((d.totalAmount - d.remainingAmount) / d.totalAmount) * 100;
                return (
                  <div key={d.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-5 hover:border-indigo-100 transition-all group relative">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-800 text-lg">{d.description}</h4>
                      <button 
                        onClick={() => handleDeleteDebt(d.id)} 
                        className="text-slate-300 hover:text-rose-500 transition-colors p-2"
                        title="Excluir Dívida"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Estado da Quitação</span>
                        <span>{prog.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${prog}%` }}></div>
                      </div>
                    </div>
                    <div className="pt-4 flex justify-between items-center border-t border-slate-50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Parcela</span>
                      <span className="text-sm font-black text-slate-700">{formatCurrency(d.installmentValue)}/mês</span>
                    </div>
                    <div className="flex justify-between items-center bg-rose-50 p-4 rounded-2xl">
                      <span className="text-[10px] text-rose-600 font-black uppercase">Saldo Devedor</span>
                      <span className="text-xl font-black text-rose-500">{formatCurrency(d.remainingAmount)}</span>
                    </div>
                  </div>
                );
              })}
              {debts.length === 0 && <div className="col-span-full p-20 text-center text-slate-400 italic bg-white border border-dashed rounded-3xl">Livre de dívidas! Mantenha assim.</div>}
            </div>
          </div>
        )}

        {/* Tab content for Buckets */}
        {activeTab === 'buckets' && (
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Ordenador Estratégico de Verbas</h2>
                <p className="text-sm text-slate-500">Distribuição recomendada baseada no lucro real: <span className="font-bold text-indigo-600">{formatCurrency(stats.realProfit)}</span></p>
              </div>
              <div className="bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 font-bold text-xs border border-emerald-100 flex items-center gap-2">
                <ShieldCheck size={16} /> Já descontado de Impostos e Pró-labore fixo
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bucketDistribution.map(b => (
                <div key={b.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between group overflow-hidden relative">
                   <div className="absolute -top-10 -right-10 w-32 h-32 opacity-5 transition-transform group-hover:scale-150" style={{ backgroundColor: b.color, borderRadius: '100%' }}></div>
                   <div className="flex justify-between items-start mb-6">
                      <div className="p-4 rounded-2xl group-hover:scale-110 transition-transform shadow-md" style={{ backgroundColor: `${b.color}20`, color: b.color }}>
                         {getBucketIcon(b.icon)}
                      </div>
                      <span className="text-[11px] font-black px-3 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-100">{b.percentage * 100}%</span>
                   </div>
                   <div>
                      <h4 className="font-bold text-slate-800 text-lg mb-1">{b.name}</h4>
                      <p className="text-3xl font-black tracking-tight" style={{ color: b.color }}>{formatCurrency(b.value)}</p>
                   </div>
                   <div className="mt-8 pt-6 border-t border-slate-50">
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Mindset Sugerido</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed italic opacity-80">
                        {b.id === 'reinvest' && 'Este é o motor da Hana Strategic. Reinvista para triplicar.'}
                        {b.id === 'lazer' && 'Sua recompensa por ser disciplinado. Curta Fernando de Noronha!'}
                        {b.id === 'imagem' && 'Invista em sua presença. Alfaiataria e estética geram autoridade.'}
                        {b.id === 'equip' && 'Setup de alta performance para produtividade elite.'}
                        {b.id === 'doar' && 'Contribua para o mundo. O transbordo é parte da riqueza.'}
                        {b.id === 'gastar' && 'Liberdade total. Compre o que quiser sem peso na consciência.'}
                      </p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modals */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold">Novo Registro</h2>
                <button onClick={() => setShowTransactionModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex bg-slate-50 p-1.5 rounded-2xl">
                  <button onClick={() => setTxFormData({...txFormData, type: TransactionType.INCOME})} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${txFormData.type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Entrada</button>
                  <button onClick={() => setTxFormData({...txFormData, type: TransactionType.EXPENSE})} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${txFormData.type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Saída</button>
                </div>
                <div className="space-y-4">
                   <input type="text" placeholder="Descrição (Ex: Venda Projeto X)" value={txFormData.description} onChange={e => setTxFormData({...txFormData, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-300 transition-all font-medium" />
                   <div className="grid grid-cols-2 gap-4">
                      <input type="number" placeholder="Valor (R$)" value={txFormData.amount || ''} onChange={e => setTxFormData({...txFormData, amount: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black" />
                      <select value={txFormData.nature} onChange={e => setTxFormData({...txFormData, nature: e.target.value as TransactionNature})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm">
                        <option value={TransactionNature.BUSINESS}>100% Empresa</option>
                        <option value={TransactionNature.PERSONAL}>100% Pessoal (Leak!)</option>
                        <option value={TransactionNature.MIXED}>Misto (Rateio)</option>
                      </select>
                   </div>
                </div>
                <button onClick={handleSaveTransaction} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">Confirmar Lançamento</button>
              </div>
            </div>
          </div>
        )}

        {showTaxModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold">Registrar Imposto</h2><button onClick={() => setShowTaxModal(false)}><X /></button></div>
              <div className="p-8 space-y-6">
                <select value={taxFormData.taxName} onChange={e => setTaxFormData({...taxFormData, taxName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold">
                  <option value="DAS - Simples Nacional">DAS - Simples Nacional</option>
                  <option value="ISS Municipal">ISS Municipal</option>
                  <option value="INSS - Pró-labore">INSS - Pró-labore</option>
                  <option value="IRPF - Pessoa Física">IRPF - Pessoa Física</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" placeholder="Valor Pago" value={taxFormData.amount || ''} onChange={e => setTaxFormData({...taxFormData, amount: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black" />
                   <input type="text" placeholder="Competência (MM/AA)" value={taxFormData.period} onChange={e => setTaxFormData({...taxFormData, period: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium" />
                </div>
                <button onClick={handleSaveTax} className="w-full py-5 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-100 hover:bg-amber-700 transition-all">Registrar Pagamento</button>
              </div>
            </div>
          </div>
        )}

        {showDebtModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold">Nova Dívida</h2><button onClick={() => setShowDebtModal(false)}><X /></button></div>
              <div className="p-8 space-y-5">
                <input type="text" placeholder="Descrição (Ex: Carro)" value={debtFormData.description} onChange={e => setDebtFormData({...debtFormData, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Valor Total" value={debtFormData.totalAmount || ''} onChange={e => setDebtFormData({...debtFormData, totalAmount: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                  <input type="number" placeholder="Saldo Restante" value={debtFormData.remainingAmount || ''} onChange={e => setDebtFormData({...debtFormData, remainingAmount: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black" />
                </div>
                <input type="number" placeholder="Parcela Mensal (R$)" value={debtFormData.installmentValue || ''} onChange={e => setDebtFormData({...debtFormData, installmentValue: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                <button onClick={handleSaveDebt} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:bg-indigo-700">Salvar Dívida</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
