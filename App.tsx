
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
  Key
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

// --- CONSTANTS ---
const ACCESS_PIN = "2025"; // O PIN para entrar no app

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('finanhome_auth') === 'true');
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // App State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('finanhome_txs');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });
  const [debts, setDebts] = useState<Debt[]>(INITIAL_DEBTS);
  const [allocationRate, setAllocationRate] = useState(DEFAULT_ALLOCATION_RATE);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'debts'>('dashboard');
  const [tip, setTip] = useState<string>('Clique para gerar insight...');
  const [isTipLoading, setIsTipLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('finanhome_txs', JSON.stringify(transactions));
  }, [transactions]);

  // Form State
  const [formData, setFormData] = useState<Partial<Transaction>>({
    description: '',
    amount: 0,
    category: 'Ambiente',
    type: TransactionType.EXPENSE,
    nature: TransactionNature.BUSINESS,
    date: new Date().toISOString().split('T')[0]
  });

  // Financial Calculations
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

  const handleAddTransaction = () => {
    if (!formData.description || !formData.amount || formData.amount <= 0) return;
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: formData.date || new Date().toISOString().split('T')[0],
      description: formData.description,
      amount: Number(formData.amount),
      category: formData.category || 'Outros',
      type: formData.type || TransactionType.EXPENSE,
      nature: formData.nature || TransactionNature.BUSINESS,
    };
    setTransactions([newTransaction, ...transactions]);
    setShowModal(false);
    setFormData({...formData, description: '', amount: 0});
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
            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              Entrar no Dashboard
            </button>
          </form>
          <div className="mt-10 pt-8 border-t border-white/5">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">FinanHome v1.0 • Seguro & Local</p>
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
            <p className="text-[11px] text-amber-700 leading-relaxed mb-3 h-20 overflow-y-auto">
              {tip}
            </p>
            <button 
              disabled={isTipLoading}
              onClick={handleFetchTip}
              className="w-full py-2 bg-white text-amber-700 text-[10px] font-bold rounded-lg shadow-sm border border-amber-200 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
            >
              {isTipLoading ? 'Consultando IA...' : 'Gerar Insight Pro'}
            </button>
          </div>
          
          <div className="mt-4 flex items-center justify-center">
            <button 
               onClick={() => (window as any).aistudio.openSelectKey()}
               className="text-[9px] text-slate-400 flex items-center gap-1 hover:text-indigo-600 transition-colors"
            >
              <Key size={10} /> Gerenciar Chave API
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Área Protegida <ShieldCheck size={20} className="text-emerald-500" />
            </h1>
            <p className="text-slate-500 text-sm">Controle de Fluxo e Metas de Portugal/Noronha.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-2 shadow-sm">
              <Home size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-400">Rateio:</span>
              <input 
                type="number" 
                value={allocationRate * 100} 
                onChange={(e) => setAllocationRate(Number(e.target.value) / 100)}
                className="w-8 text-sm font-bold text-indigo-600 focus:outline-none"
              />
              <span className="text-sm font-bold text-indigo-600">%</span>
            </div>
            <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
              <PlusCircle size={18} /> Novo Gasto
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Faturamento Bruto" value={`R$ ${stats.totalRevenue.toLocaleString()}`} icon={<ArrowUpRight className="text-emerald-500" />} />
              <StatCard title="Lucro Real" value={`R$ ${stats.realProfit.toLocaleString()}`} subtitle="Pós-Custos Business" icon={<Briefcase className="text-indigo-500" />} />
              <StatCard title="Cafés/Externos" value={`R$ ${transactions.filter(t => t.category === 'Ambiente' && t.nature === TransactionNature.BUSINESS).reduce((acc, t) => acc + t.amount, 0).toLocaleString()}`} icon={<Coffee className="text-amber-500" />} />
              <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between ${stats.accountMixLeakage > 5 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-slate-500 text-sm font-medium">Mix de Contas</h3>
                  <AlertTriangle className={stats.accountMixLeakage > 5 ? 'text-orange-600' : 'text-slate-400'} size={20} />
                </div>
                <div className={`text-2xl font-bold ${stats.accountMixLeakage > 5 ? 'text-orange-700' : 'text-slate-900'}`}>{stats.accountMixLeakage.toFixed(1)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <GoalCard progress={stats.totalRevenue} target={ANNUAL_GOAL} />
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Target className="text-indigo-600" /> Recompensas Ativas</h3>
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
                          {isAchieved && <div className="text-[9px] font-black text-emerald-600">UNLOCKED</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-lg text-slate-800 mb-6">Impacto por Categoria</h3>
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

        {showModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Novo Registro</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Descrição</label>
                  <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Valor</label>
                    <input type="number" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Natureza</label>
                    <select value={formData.nature} onChange={e => setFormData({...formData, nature: e.target.value as TransactionNature})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value={TransactionNature.BUSINESS}>Empresa</option>
                      <option value={TransactionNature.PERSONAL}>Pessoal</option>
                      <option value={TransactionNature.MIXED}>Misto (Rateio)</option>
                    </select>
                  </div>
                </div>
                <button onClick={handleAddTransaction} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">Salvar Lançamento</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Natureza</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-400">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold">{t.description}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${t.nature === TransactionNature.BUSINESS ? 'border-indigo-200 text-indigo-700' : t.nature === TransactionNature.PERSONAL ? 'border-orange-200 text-orange-700' : 'border-amber-200 text-amber-700'}`}>
                          {t.nature === TransactionNature.BUSINESS ? 'Business' : t.nature === TransactionNature.PERSONAL ? 'Pessoal' : 'Misto'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">R$ {t.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}

        {activeTab === 'debts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-xl text-slate-900 mb-6">Quitação de Parcelados</h3>
              <div className="space-y-8">
                {debts.map(debt => {
                  const progress = ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100;
                  return (
                    <div key={debt.id} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <h4 className="font-bold text-slate-700">{debt.description}</h4>
                        <span className="text-xl font-black text-emerald-600">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white">
              <h3 className="font-bold text-xl mb-6">Status da Meta Portugal</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">Considerando seu ritmo atual de R$ {stats.totalRevenue.toLocaleString()} faturados, você está no caminho certo. Evite que despesas pessoais superem 10% do seu faturamento bruto.</p>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">Faltam para Meta de 550K</span>
                <span className="text-2xl font-black">R$ {(ANNUAL_GOAL - stats.totalRevenue).toLocaleString()}</span>
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
