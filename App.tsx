
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
  User,
  Briefcase,
  X,
  Coffee,
  Home,
  Lock,
  ShieldCheck,
  Key,
  Pencil,
  Trash2,
  Save,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

import { 
  Transaction, 
  TransactionType, 
  TransactionNature, 
  Debt, 
  FinancialStats 
} from './types.ts';
import { 
  INITIAL_TRANSACTIONS, 
  INITIAL_DEBTS, 
  ANNUAL_GOAL, 
  DEFAULT_ALLOCATION_RATE,
  MILESTONES 
} from './constants.ts';
import { StatCard, GoalCard } from './components/ui/Cards.tsx';
import { getFinancialTip } from './services/geminiService.ts';

const ACCESS_PIN = "2025";

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('finanhome_auth') === 'true');
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('finanhome_txs');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });
  const [debts, setDebts] = useState<Debt[]>(() => {
    const saved = localStorage.getItem('finanhome_debts');
    return saved ? JSON.parse(saved) : INITIAL_DEBTS;
  });
  const [allocationRate, setAllocationRate] = useState(DEFAULT_ALLOCATION_RATE);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'debts'>('dashboard');
  
  // UI State
  const [tip, setTip] = useState<string>('Clique para gerar insight...');
  const [isTipLoading, setIsTipLoading] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [txFormData, setTxFormData] = useState<Partial<Transaction>>({
    description: '',
    amount: 0,
    category: 'Vendas',
    type: TransactionType.INCOME,
    nature: TransactionNature.BUSINESS,
    date: new Date().toISOString().split('T')[0]
  });

  const [debtFormData, setDebtFormData] = useState<Partial<Debt>>({
    description: '',
    totalAmount: 0,
    remainingAmount: 0,
    installmentValue: 0,
    installmentsTotal: 1,
    installmentsPaid: 0
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('finanhome_txs', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('finanhome_debts', JSON.stringify(debts));
  }, [debts]);

  // Calculations
  const stats: FinancialStats = useMemo(() => {
    let revenue = 0;
    let businessCosts = 0;
    let personalCosts = 0;
    let personalLeakedInBusiness = 0;

    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME) {
        revenue += t.amount;
      } else {
        if (t.nature === TransactionNature.BUSINESS) {
          businessCosts += t.amount;
        } else if (t.nature === TransactionNature.PERSONAL) {
          personalCosts += t.amount;
          personalLeakedInBusiness += t.amount;
        } else if (t.nature === TransactionNature.MIXED) {
          businessCosts += t.amount * allocationRate;
          personalCosts += t.amount * (1 - allocationRate);
        }
      }
    });

    return {
      totalRevenue: revenue,
      totalBusinessCosts: businessCosts,
      totalPersonalCosts: personalCosts,
      realProfit: revenue - businessCosts,
      accountMixLeakage: (personalLeakedInBusiness / (businessCosts + personalLeakedInBusiness || 1)) * 100,
      goalProgress: (revenue / ANNUAL_GOAL) * 100
    };
  }, [transactions, allocationRate]);

  // Auth Handlers
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ACCESS_PIN) {
      setIsAuthenticated(true);
      localStorage.setItem('finanhome_auth', 'true');
    } else {
      setAuthError(true);
      setPinInput('');
      setTimeout(() => setAuthError(false), 2000);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('finanhome_auth');
  };

  // AI Tip Handler
  const handleFetchTip = async () => {
    if (typeof window.aistudio !== 'undefined') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        return;
      }
    }
    setIsTipLoading(true);
    const newTip = await getFinancialTip(stats, ANNUAL_GOAL);
    if (newTip === "NECESSÁRIO_CHAVE") {
      await window.aistudio.openSelectKey();
    } else {
      setTip(newTip);
    }
    setIsTipLoading(false);
  };

  // Transaction Handlers
  const openAddTransaction = (type: TransactionType = TransactionType.INCOME) => {
    setEditingId(null);
    setTxFormData({
      description: '',
      amount: 0,
      category: type === TransactionType.INCOME ? 'Vendas' : 'Ambiente',
      type: type,
      nature: TransactionNature.BUSINESS,
      date: new Date().toISOString().split('T')[0]
    });
    setShowTransactionModal(true);
  };

  const openEditTransaction = (tx: Transaction) => {
    setEditingId(tx.id);
    setTxFormData({ ...tx });
    setShowTransactionModal(true);
  };

  const handleSaveTransaction = () => {
    if (!txFormData.description || !txFormData.amount || txFormData.amount <= 0) return;
    
    if (editingId) {
      setTransactions(transactions.map(t => t.id === editingId ? { ...t, ...txFormData } as Transaction : t));
    } else {
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        date: txFormData.date || new Date().toISOString().split('T')[0],
        description: txFormData.description!,
        amount: Number(txFormData.amount),
        category: txFormData.category || 'Outros',
        type: txFormData.type || TransactionType.EXPENSE,
        nature: txFormData.nature || TransactionNature.BUSINESS,
      };
      setTransactions([newTransaction, ...transactions]);
    }
    setShowTransactionModal(false);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento?")) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  // Debt Handlers
  const openAddDebt = () => {
    setEditingId(null);
    setDebtFormData({
      description: '',
      totalAmount: 0,
      remainingAmount: 0,
      installmentValue: 0,
      installmentsTotal: 1,
      installmentsPaid: 0
    });
    setShowDebtModal(true);
  };

  const openEditDebt = (debt: Debt) => {
    setEditingId(debt.id);
    setDebtFormData({ ...debt });
    setShowDebtModal(true);
  };

  const handleSaveDebt = () => {
    if (!debtFormData.description || !debtFormData.totalAmount) return;
    
    if (editingId) {
      setDebts(debts.map(d => d.id === editingId ? { ...d, ...debtFormData } as Debt : d));
    } else {
      const newDebt: Debt = {
        id: Math.random().toString(36).substr(2, 9),
        description: debtFormData.description!,
        totalAmount: Number(debtFormData.totalAmount),
        remainingAmount: Number(debtFormData.remainingAmount),
        installmentValue: Number(debtFormData.installmentValue),
        installmentsTotal: Number(debtFormData.installmentsTotal),
        installmentsPaid: Number(debtFormData.installmentsPaid),
      };
      setDebts([...debts, newDebt]);
    }
    setShowDebtModal(false);
  };

  const handleDeleteDebt = (id: string) => {
    if (confirm("Deseja realmente excluir esta dívida?")) {
      setDebts(debts.filter(d => d.id !== id));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl text-center">
          <div className="w-20 h-20 bg-indigo-600/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/30">
            <Lock className="text-indigo-400 w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Privado</h1>
          <p className="text-slate-400 text-sm mb-8">Insira o PIN de 4 dígitos para gerenciar seu patrimônio.</p>
          <form onSubmit={handleAuth} className="space-y-6">
            <input 
              type="password" 
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className={`w-full bg-slate-800/50 border ${authError ? 'border-rose-500 animate-shake' : 'border-slate-700'} rounded-2xl py-4 text-center text-3xl tracking-[1em] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono`}
            />
            {authError && <p className="text-rose-500 text-xs font-bold uppercase tracking-widest">PIN Incorreto</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95">Entrar no Dashboard</button>
          </form>
          <div className="mt-10 pt-8 border-t border-white/5">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">FinanHome v1.2 • Registro de Ganhos</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-auto md:h-screen z-10">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            <Calculator className="w-8 h-8" />
            <span>FinanHome</span>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600"><Lock size={16} /></button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('transactions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <TrendingUp size={20} /> Lançamentos
          </button>
          <button onClick={() => setActiveTab('debts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'debts' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <CreditCard size={20} /> Dívidas
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 relative group">
            <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2">
              <Lightbulb size={18} />
              <span className="text-sm">Estratégia CFO</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed mb-3 h-20 overflow-y-auto">{tip}</p>
            <button disabled={isTipLoading} onClick={handleFetchTip} className="w-full py-2 bg-white text-amber-700 text-[10px] font-bold rounded-lg shadow-sm border border-amber-200 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2">
              {isTipLoading ? 'Consultando IA...' : 'Gerar Insight Pro'}
            </button>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <button onClick={() => (window as any).aistudio.openSelectKey()} className="text-[9px] text-slate-400 flex items-center gap-1 hover:text-indigo-600 transition-colors">
              <Key size={10} /> Chave API
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Gestão Financeira <ShieldCheck size={20} className="text-emerald-500" />
            </h1>
            <p className="text-slate-500 text-sm">Dashboard 100% dinâmico e editável.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-2 shadow-sm">
              <Home size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-400">Rateio:</span>
              <input type="number" value={allocationRate * 100} onChange={(e) => setAllocationRate(Number(e.target.value) / 100)} className="w-8 text-sm font-bold text-indigo-600 outline-none" />
              <span className="text-sm font-bold text-indigo-600">%</span>
            </div>
            <div className="flex gap-2">
               <button onClick={() => openAddTransaction(TransactionType.INCOME)} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm">
                <PlusCircle size={18} /> Registrar Ganho
              </button>
              <button onClick={() => openAddTransaction(TransactionType.EXPENSE)} className="bg-slate-800 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md hover:bg-slate-900 transition-all flex items-center gap-2 text-sm">
                <TrendingDown size={18} /> Novo Gasto
              </button>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Entradas Totais" value={`R$ ${stats.totalRevenue.toLocaleString()}`} icon={<Wallet className="text-emerald-500" />} />
              <StatCard title="Lucro Real" value={`R$ ${stats.realProfit.toLocaleString()}`} subtitle="Pós-Custos Empresa" icon={<Briefcase className="text-indigo-500" />} />
              <StatCard title="Custos Empresa" value={`R$ ${stats.totalBusinessCosts.toLocaleString()}`} icon={<TrendingDown className="text-rose-500" />} />
              <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between ${stats.accountMixLeakage > 5 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-slate-500 text-sm font-medium">Furo Pessoal na PJ</h3>
                  <AlertTriangle className={stats.accountMixLeakage > 5 ? 'text-orange-600' : 'text-slate-400'} size={20} />
                </div>
                <div className={`text-2xl font-bold ${stats.accountMixLeakage > 5 ? 'text-orange-700' : 'text-slate-900'}`}>{stats.accountMixLeakage.toFixed(1)}%</div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <GoalCard progress={stats.totalRevenue} target={ANNUAL_GOAL} />
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Target className="text-indigo-600" /> Metas Gamificadas</h3>
                  <div className="space-y-4">
                    {MILESTONES.map((m) => {
                      const isAchieved = stats.totalRevenue >= m.target;
                      return (
                        <div key={m.target} className={`flex items-center gap-4 p-3 rounded-xl border ${isAchieved ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100 grayscale opacity-40'}`}>
                          <span className="text-2xl">{m.icon}</span>
                          <div className="flex-1">
                            <h4 className={`text-sm font-bold ${isAchieved ? 'text-emerald-700' : 'text-slate-500'}`}>{m.label}</h4>
                            <p className="text-[10px] text-slate-500">{m.reward}</p>
                          </div>
                          {isAchieved && <div className="text-[9px] font-black text-emerald-600">CONQUISTADO</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-lg text-slate-800 mb-6">Custos Operacionais</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(transactions.reduce((acc: any, t) => {
                      if(t.type === TransactionType.EXPENSE) acc[t.category] = (acc[t.category] || 0) + t.amount;
                      return acc;
                    }, {})).map(([name, value]) => ({ name, value }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal Lançamento */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
                <button onClick={() => setShowTransactionModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <div className="p-8 space-y-6">
                {/* Seletor de Tipo */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  <button 
                    onClick={() => setTxFormData({...txFormData, type: TransactionType.INCOME, category: 'Vendas'})}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${txFormData.type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    <ArrowUpRight size={18} /> Entrada
                  </button>
                  <button 
                    onClick={() => setTxFormData({...txFormData, type: TransactionType.EXPENSE, category: 'Ambiente'})}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${txFormData.type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    <ArrowDownRight size={18} /> Saída
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Descrição</label>
                  <input type="text" placeholder="Ex: Consultoria XYZ ou Aluguel Março" value={txFormData.description} onChange={e => setTxFormData({...txFormData, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Valor</label>
                    <input type="number" value={txFormData.amount || ''} onChange={e => setTxFormData({...txFormData, amount: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Natureza</label>
                    <select value={txFormData.nature} onChange={e => setTxFormData({...txFormData, nature: e.target.value as TransactionNature})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold">
                      <option value={TransactionNature.BUSINESS}>100% Empresa</option>
                      <option value={TransactionNature.PERSONAL}>100% Pessoal</option>
                      <option value={TransactionNature.MIXED}>Misto (Rateio)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Categoria</label>
                  <input type="text" placeholder="Ex: Marketing, Vendas, Habitação..." value={txFormData.category} onChange={e => setTxFormData({...txFormData, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>

                <button onClick={handleSaveTransaction} className={`w-full py-4 text-white font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${txFormData.type === TransactionType.INCOME ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'}`}>
                  <Save size={18} /> {editingId ? 'Atualizar Lançamento' : 'Salvar Registro'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Dívida */}
        {showDebtModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Editar Dívida' : 'Nova Dívida'}</h2>
                <button onClick={() => setShowDebtModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <div className="p-8 space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Descrição</label>
                  <input type="text" value={debtFormData.description} onChange={e => setDebtFormData({...debtFormData, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Valor Total</label>
                    <input type="number" value={debtFormData.totalAmount || ''} onChange={e => setDebtFormData({...debtFormData, totalAmount: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Falta Quitar</label>
                    <input type="number" value={debtFormData.remainingAmount || ''} onChange={e => setDebtFormData({...debtFormData, remainingAmount: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Valor da Parcela</label>
                  <input type="number" value={debtFormData.installmentValue || ''} onChange={e => setDebtFormData({...debtFormData, installmentValue: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
                <button onClick={handleSaveDebt} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                  <Save size={18} /> {editingId ? 'Atualizar Dívida' : 'Salvar Dívida'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Listagem de Transações */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Natureza</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-400">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-800">{t.description}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{t.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${t.nature === TransactionNature.BUSINESS ? 'border-indigo-200 text-indigo-700' : t.nature === TransactionNature.PERSONAL ? 'border-orange-200 text-orange-700' : 'border-amber-200 text-amber-700'}`}>
                          {t.nature === TransactionNature.BUSINESS ? 'Business' : t.nature === TransactionNature.PERSONAL ? 'Pessoal' : 'Misto'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {t.type === TransactionType.INCOME ? '+' : ''} R$ {t.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditTransaction(t)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteTransaction(t.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}

        {/* Aba de Dívidas */}
        {activeTab === 'debts' && (
          <div className="space-y-8">
            <div className="flex justify-end">
              <button onClick={openAddDebt} className="bg-white text-indigo-600 px-5 py-2.5 rounded-xl font-bold border border-indigo-100 shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2">
                <PlusCircle size={18} /> Nova Dívida/Parcelado
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-xl text-slate-900 mb-6">Controle de Quitação</h3>
                <div className="space-y-8">
                  {debts.map(debt => {
                    const progress = ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100;
                    return (
                      <div key={debt.id} className="group space-y-3 p-2 rounded-2xl hover:bg-slate-50 transition-all">
                        <div className="flex justify-between items-end">
                          <div>
                            <h4 className="font-bold text-slate-700">{debt.description}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Parcela: R$ {debt.installmentValue.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xl font-black text-emerald-600">{progress.toFixed(0)}%</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => openEditDebt(debt)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Pencil size={14} /></button>
                              <button onClick={() => handleDeleteDebt(debt.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3">
                          <div className="bg-emerald-500 h-3 rounded-full shadow-sm" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white">
                <h3 className="font-bold text-xl mb-6">Viagens & Recompensas</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6 italic border-l-4 border-indigo-500 pl-4">"Cada dívida quitada aqui é dinheiro livre para Fernando de Noronha e Portugal. Mantenha o foco na redução do passivo pessoal."</p>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">Total Comprometido (Parcelas)</span>
                    <span className="text-2xl font-black">R$ {debts.reduce((acc, d) => acc + d.installmentValue, 0).toLocaleString()} / mês</span>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Déficit para Meta 550K</span>
                    <span className="text-2xl font-black">R$ {(ANNUAL_GOAL - stats.totalRevenue).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default App;
