
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Target,
  Briefcase,
  X,
  Home,
  Lock,
  ShieldCheck,
  Key,
  Pencil,
  Trash2,
  Save,
  TrendingDown,
  Wallet,
  Zap,
  PieChart as PieChartIcon,
  Percent,
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
  Plane,
  Palmtree,
  Coffee,
  CheckCircle2
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
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleSaveDebt = () => {
    if (!debtFormData.description || !debtFormData.totalAmount) return;
    setDebts([{ ...debtFormData, id: Math.random().toString(36).substr(2, 9) } as Debt, ...debts]);
    setShowDebtModal(false);
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
              <h4 className="text-rose-900 font-bold text-sm">Alerta de Vazamento (Leakage)</h4>
              <p className="text-rose-700 text-xs">A empresa pagou {formatCurrency(stats.personalLeakedInBusiness)} de contas suas. Corrija isso no Fluxo de Caixa.</p>
            </div>
            <button onClick={() => setActiveTab('transactions')} className="text-xs font-bold text-rose-600 underline">Separar Agora</button>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">Hana <span className="text-indigo-600">Strategic</span></h1>
            <p className="text-slate-500 text-sm font-medium">Controle total sobre o lucro real e separação de contas.</p>
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
              <div className={`p-6 rounded-2xl border ${stats.accountMixLeakage > 5 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'} flex flex-col justify-between`}>
                 <div className="flex justify-between items-start">
                    <h3 className="text-slate-500 text-sm font-medium">Leakage (Vazamento)</h3>
                    <AlertTriangle className={stats.accountMixLeakage > 5 ? 'text-rose-600' : 'text-slate-400'} size={18} />
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
                
                {/* Gamificação: Recompensas Restauradas */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Trophy className="text-amber-500" size={20} /> Recompensas do Ano</h3>
                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded">5 Estágios</span>
                  </div>
                  <div className="space-y-4">
                    {MILESTONES.map((m, idx) => {
                      const isUnlocked = stats.totalRevenue >= m.target;
                      return (
                        <div key={idx} className={`relative flex items-center gap-4 p-3 rounded-2xl border transition-all ${isUnlocked ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-50 opacity-60'}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm ${isUnlocked ? 'bg-white' : 'bg-slate-50'}`}>
                            {m.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className={`text-[11px] font-bold uppercase tracking-tight ${isUnlocked ? 'text-indigo-900' : 'text-slate-500'}`}>{m.label}</h4>
                            <p className={`text-xs font-semibold ${isUnlocked ? 'text-indigo-600' : 'text-slate-400'}`}>{m.reward}</p>
                          </div>
                          {isUnlocked && <CheckCircle2 className="text-emerald-500" size={18} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resumo de Dívidas Restaurado na Visão Geral */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><CreditCard className="text-rose-500" size={20} /> Resumo de Dívidas</h3>
                  <div className="space-y-4">
                    {debts.slice(0, 3).map(d => {
                      const prog = ((d.totalAmount - d.remainingAmount) / d.totalAmount) * 100;
                      return (
                        <div key={d.id} className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700">{d.description}</span>
                            <span className="text-[10px] font-black text-rose-500">{formatCurrency(d.remainingAmount)}</span>
                          </div>
                          <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${prog}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                    {debts.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma dívida registrada.</p>}
                    <button onClick={() => setActiveTab('debts')} className="w-full py-2 mt-2 text-[10px] font-bold text-slate-400 uppercase border border-slate-100 rounded-xl hover:bg-slate-50 transition-all">Gerenciar Todas</button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <h3 className="font-bold text-lg mb-8 flex items-center gap-2"><PieChartIcon className="text-indigo-600" /> Distribuição Estratégica</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={[
                            { name: 'Impostos', value: stats.totalTaxesPaid, color: '#f59e0b' },
                            { name: 'Pró-labore', value: stats.proLabore, color: '#6366f1' },
                            { name: 'Custos Op', value: stats.totalBusinessCosts - stats.proLabore - stats.totalTaxesPaid, color: '#94a3b8' },
                            { name: 'Lucro Disponível', value: stats.realProfit, color: '#10b981' },
                            { name: 'Vazamento Pessoal', value: stats.personalLeakedInBusiness, color: '#ef4444' }
                          ]} 
                          innerRadius={80} 
                          outerRadius={110} 
                          paddingAngle={5} 
                          dataKey="value"
                        >
                          {[0,1,2,3,4].map((_, i) => <Cell key={i} fill={['#f59e0b', '#6366f1', '#94a3b8', '#10b981', '#ef4444'][i]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Op. Costs (PJ)</p>
                        <p className="text-sm font-black text-slate-700">{formatCurrency(stats.totalBusinessCosts - stats.totalTaxesPaid - stats.proLabore)}</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                        <p className="text-[10px] font-bold text-indigo-400 mb-1 uppercase tracking-widest">Total Custos PJ</p>
                        <p className="text-sm font-black text-indigo-700">{formatCurrency(stats.totalBusinessCosts)}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-400 mb-1 uppercase tracking-widest">Margem Líquida</p>
                        <p className="text-sm font-black text-emerald-700">{((stats.realProfit / stats.totalRevenue) * 100 || 0).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Sparkles className="text-amber-500" /> Baldes de Destino</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {bucketDistribution.slice(0, 6).map(b => (
                      <div key={b.id} className="p-4 rounded-2xl border border-slate-50 bg-slate-50/30">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${b.color}20`, color: b.color }}>
                            {getBucketIcon(b.icon)}
                          </div>
                          <span className="text-[9px] font-black uppercase text-slate-400">{b.name.split(' ')[0]}</span>
                        </div>
                        <p className="text-sm font-black text-slate-800 tracking-tight">{formatCurrency(b.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab content for Buckets */}
        {activeTab === 'buckets' && (
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Ordenador de Verbas</h2>
                <p className="text-sm text-slate-500">Distribuição recomendada do lucro real: <span className="font-bold text-indigo-600">{formatCurrency(stats.realProfit)}</span></p>
              </div>
              <div className="bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 font-bold text-xs border border-emerald-100 flex items-center gap-2">
                <ShieldCheck size={16} /> Já descontado impostos e seu Pró-labore
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bucketDistribution.map(b => (
                <div key={b.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between group">
                   <div className="flex justify-between items-start mb-6">
                      <div className="p-4 rounded-2xl group-hover:scale-110 transition-transform shadow-sm" style={{ backgroundColor: `${b.color}15`, color: b.color }}>
                         {getBucketIcon(b.icon)}
                      </div>
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-100">{b.percentage * 100}%</span>
                   </div>
                   <div>
                      <h4 className="font-bold text-slate-800 text-lg mb-1">{b.name}</h4>
                      <p className="text-2xl font-black tracking-tight" style={{ color: b.color }}>{formatCurrency(b.value)}</p>
                   </div>
                   <div className="mt-6 pt-5 border-t border-slate-50">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Objetivo</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed italic">
                        {b.id === 'reinvest' && 'Fundo para o próximo nível da empresa.'}
                        {b.id === 'lazer' && 'Viagens, jantares e momentos de recompensa.'}
                        {b.id === 'imagem' && 'Alfaiataria e autocuidado para marca pessoal.'}
                        {b.id === 'equip' && 'Equipamentos e tecnologia de ponta.'}
                        {b.id === 'doar' && 'Contribuição social e impacto positivo.'}
                        {b.id === 'gastar' && 'Verba para gastos impulsivos sem culpa.'}
                      </p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Tabs: Transactions, Taxes, Debts remain with same design */}
        {activeTab === 'transactions' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold">Fluxo de Caixa</h2>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                    <tr><th className="p-6">Data</th><th className="p-6">Descrição</th><th className="p-6">Natureza</th><th className="p-6 text-right">Valor</th><th className="p-6 text-center">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-6 text-xs text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-6 font-bold text-slate-800">{t.description}</td>
                        <td className="p-6">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${t.nature === TransactionNature.BUSINESS ? 'border-indigo-100 text-indigo-600' : t.nature === TransactionNature.PERSONAL ? 'border-rose-100 text-rose-600' : 'border-amber-100 text-amber-600'}`}>
                            {t.nature === TransactionNature.BUSINESS ? 'Business' : t.nature === TransactionNature.PERSONAL ? 'MISTURA (PESSOAL)' : 'Rateio'}
                          </span>
                        </td>
                        <td className={`p-6 text-right font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-900'}`}>{t.type === TransactionType.INCOME ? '+' : ''} {formatCurrency(t.amount)}</td>
                        <td className="p-6 text-center">
                          <button onClick={() => setTransactions(transactions.filter(x => x.id !== t.id))} className="p-2 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}

        {activeTab === 'taxes' && (
           <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Impostos Pagos</h2>
                <button onClick={() => setShowTaxModal(true)} className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-amber-500/20 hover:scale-105 transition-all">Registrar Pagamento</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Pago (Ano)" value={formatCurrency(stats.totalTaxesPaid)} icon={<Landmark className="text-amber-600" />} />
                <StatCard title="Provisionado" value={formatCurrency(stats.taxProvision)} subtitle="Estimativa 6%" icon={<FileText className="text-slate-400" />} />
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Eficiência Fiscal</p>
                   <div className="text-2xl font-black text-indigo-600">{((stats.totalTaxesPaid / (stats.taxProvision || 1)) * 100).toFixed(0)}%</div>
                </div>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                      <tr><th className="p-6">Data</th><th className="p-6">Imposto</th><th className="p-6">Competência</th><th className="p-6 text-right">Valor</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {taxPayments.map(p => (
                        <tr key={p.id}>
                          <td className="p-6 text-xs text-slate-400">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                          <td className="p-6 font-bold">{p.taxName}</td>
                          <td className="p-6 text-slate-500 text-sm">{p.period}</td>
                          <td className="p-6 text-right font-black text-amber-600">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeTab === 'debts' && (
          <div className="space-y-10">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Controle de Dívidas</h2>
              <button onClick={() => setShowDebtModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-600/20">Nova Dívida</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {debts.map(d => {
                const prog = ((d.totalAmount - d.remainingAmount) / d.totalAmount) * 100;
                return (
                  <div key={d.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-5 hover:border-indigo-100 transition-all group">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{d.description}</h4>
                      <button onClick={() => setDebts(debts.filter(x => x.id !== d.id))} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>Progresso</span>
                        <span>{prog.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${prog}%` }}></div>
                      </div>
                    </div>
                    <div className="pt-4 flex justify-between items-center border-t border-slate-50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Parcela Mensal</span>
                      <span className="text-sm font-bold text-slate-700">{formatCurrency(d.installmentValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saldo Devedor</span>
                      <span className="text-xl font-black text-rose-500">{formatCurrency(d.remainingAmount)}</span>
                    </div>
                  </div>
                );
              })}
              {debts.length === 0 && <div className="col-span-full p-20 text-center text-slate-400 italic">Nenhuma dívida cadastrada.</div>}
            </div>
          </div>
        )}

        {/* Modals are unchanged but included to complete the file */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold">Novo Registro</h2><button onClick={() => setShowTransactionModal(false)}><X /></button></div>
              <div className="p-8 space-y-6">
                <div className="flex bg-slate-50 p-1 rounded-2xl">
                  <button onClick={() => setTxFormData({...txFormData, type: TransactionType.INCOME})} className={`flex-1 py-3 rounded-xl text-xs font-bold ${txFormData.type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Entrada</button>
                  <button onClick={() => setTxFormData({...txFormData, type: TransactionType.EXPENSE})} className={`flex-1 py-3 rounded-xl text-xs font-bold ${txFormData.type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Saída</button>
                </div>
                <div className="space-y-4">
                   <input type="text" placeholder="Descrição" value={txFormData.description} onChange={e => setTxFormData({...txFormData, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                   <div className="grid grid-cols-2 gap-4">
                      <input type="number" placeholder="Valor (R$)" value={txFormData.amount || ''} onChange={e => setTxFormData({...txFormData, amount: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black" />
                      <select value={txFormData.nature} onChange={e => setTxFormData({...txFormData, nature: e.target.value as TransactionNature})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold">
                        <option value={TransactionNature.BUSINESS}>100% Empresa</option>
                        <option value={TransactionNature.PERSONAL}>100% Pessoal</option>
                        <option value={TransactionNature.MIXED}>Misto (Rateio)</option>
                      </select>
                   </div>
                </div>
                <button onClick={handleSaveTransaction} className="w-full py-5 bg-indigo-600 text-white font-bold rounded-[1.5rem] shadow-xl shadow-indigo-600/30">Confirmar Lançamento</button>
              </div>
            </div>
          </div>
        )}

        {showTaxModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold">Registrar Guia</h2><button onClick={() => setShowTaxModal(false)}><X /></button></div>
              <div className="p-8 space-y-6">
                <select value={taxFormData.taxName} onChange={e => setTaxFormData({...taxFormData, taxName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold">
                  <option value="DAS - Simples Nacional">DAS - Simples Nacional</option>
                  <option value="ISS Municipal">ISS Municipal</option>
                  <option value="INSS - Pró-labore">INSS - Pró-labore</option>
                  <option value="IRPF - Pessoa Física">IRPF - Pessoa Física</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" placeholder="Valor Pago" value={taxFormData.amount || ''} onChange={e => setTaxFormData({...taxFormData, amount: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black" />
                   <input type="text" placeholder="Competência (MM/AA)" value={taxFormData.period} onChange={e => setTaxFormData({...taxFormData, period: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                </div>
                <button onClick={() => {
                   setTaxPayments([{...taxFormData, id: Math.random().toString(36).substr(2, 9)} as TaxPayment, ...taxPayments]);
                   setShowTaxModal(false);
                }} className="w-full py-5 bg-amber-600 text-white font-bold rounded-[1.5rem] shadow-xl shadow-amber-600/30">Registrar Pagamento</button>
              </div>
            </div>
          </div>
        )}

        {showDebtModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold">Dívida / Parcelado</h2><button onClick={() => setShowDebtModal(false)}><X /></button></div>
              <div className="p-8 space-y-5">
                <input type="text" placeholder="Descrição (Ex: Carro)" value={debtFormData.description} onChange={e => setDebtFormData({...debtFormData, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Valor Total" value={debtFormData.totalAmount || ''} onChange={e => setDebtFormData({...debtFormData, totalAmount: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                  <input type="number" placeholder="Saldo Devedor" value={debtFormData.remainingAmount || ''} onChange={e => setDebtFormData({...debtFormData, remainingAmount: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" />
                </div>
                <input type="number" placeholder="Valor da Parcela" value={debtFormData.installmentValue || ''} onChange={e => setDebtFormData({...debtFormData, installmentValue: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                <button onClick={handleSaveDebt} className="w-full py-5 bg-indigo-600 text-white font-bold rounded-[1.5rem] shadow-xl shadow-indigo-600/30">Salvar Dívida</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
