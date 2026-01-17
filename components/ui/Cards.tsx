
import React from 'react';

interface CardProps {
  title: string;
  // Fixed: Changed value type from string | number to React.ReactNode to support passing components like TabularNumber
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isUp: boolean;
  };
  color?: string;
}

const formatCurrencyLocal = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const StatCard: React.FC<CardProps> = ({ title, value, subtitle, icon, trend, color = 'bg-white' }) => {
  return (
    <div className={`${color} p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        <div className="p-2 bg-slate-50 rounded-lg">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {subtitle && <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center mt-2 text-xs font-medium ${trend.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
            <span>{trend.isUp ? '↑' : '↓'} {trend.value}%</span>
            <span className="text-slate-400 ml-1">vs anterior</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const GoalCard: React.FC<{ progress: number, target: number }> = ({ progress, target }) => {
  const percent = Math.min((progress / target) * 100, 100);
  
  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-lg text-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Meta Anual 550K</h3>
        <span className="text-indigo-100 text-sm font-bold">{percent.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-indigo-900/40 rounded-full h-3 mb-4">
        <div 
          className="bg-emerald-400 h-3 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-[10px] font-black text-indigo-100 uppercase tracking-widest">
        <span>{formatCurrencyLocal(progress)}</span>
        <span>{formatCurrencyLocal(target)}</span>
      </div>
    </div>
  );
};
