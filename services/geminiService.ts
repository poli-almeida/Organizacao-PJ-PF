
import { GoogleGenAI } from "@google/genai";
import { FinancialStats, Debt } from '../types.ts';

export const getFinancialTip = async (stats: any, annualGoal: number, debts: Debt[], ticketMedio: number = 5000) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const remainingGoal = annualGoal - stats.totalRevenue;
  
  const highRiskDebts = debts.filter(d => d.isHighRisk || d.debtType === 'CREDIT_CARD');
  const totalDebt = debts.reduce((acc, d) => acc + d.remainingAmount, 0);
  const monthlyDebtImpact = debts.reduce((acc, d) => acc + d.installmentValue, 0);

  const prompt = `
    Você é a CFO Estratégica da "Hana Finance". Seu tom é profissional, direto, analítico e focado em lucro real e proteção patrimonial.
    
    Cenário Atual da Empresa:
    - Receita Bruta Acumulada: R$ ${stats.totalRevenue.toLocaleString('pt-BR')}
    - Custos Operacionais PJ (incl. Rateio e Pro-labore): R$ ${stats.totalBusinessCosts.toLocaleString('pt-BR')}
    - Lucro Líquido Real Disponível: R$ ${stats.realProfit.toLocaleString('pt-BR')}
    - Vazamento Pessoal (Leakage): R$ ${stats.personalLeakedInBusiness.toLocaleString('pt-BR')} (${stats.accountMixLeakage.toFixed(1)}%)
    - Meta Anual: R$ ${annualGoal.toLocaleString('pt-BR')} (Faltam: R$ ${remainingGoal.toLocaleString('pt-BR')})
    
    Passivo e Dívidas:
    - Dívida Total: R$ ${totalDebt.toLocaleString('pt-BR')}
    - Impacto Mensal no Fluxo: R$ ${monthlyDebtImpact.toLocaleString('pt-BR')}
    - Dívidas de Alto Risco (Cartão/Juros): R$ ${highRiskDebts.reduce((a,b) => a + b.remainingAmount, 0).toLocaleString('pt-BR')}
    
    Parâmetros de Vendas:
    - Ticket Médio por Cliente: R$ ${ticketMedio.toLocaleString('pt-BR')}

    TAREFA: Gere uma análise de CFO robusta.
    1. Diagnóstico rápido do "Leakage" e do Lucro Real.
    2. Cálculo Exato: Quantos novos clientes (baseado no ticket médio) são necessários para quitar as dívidas de alto risco em 3 meses?
    3. Sugestão de alocação: Se houver lucro, quanto deve ir para o "Balde de Reinvestimento" para acelerar a meta de R$ 550k.
    4. Uma frase de impacto sobre disciplina financeira PJ.

    Formate a resposta com parágrafos claros, use negrito para valores importantes. Responda em Português.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.7,
      }
    });
    return response.text || "Erro ao processar análise estratégica.";
  } catch (error: any) {
    console.error("Erro no Gemini:", error);
    return `Análise indisponível. Seu Leakage está em ${stats.accountMixLeakage.toFixed(1)}%. Foque em bater os R$ ${remainingGoal.toLocaleString('pt-BR')} restantes para sua meta anual.`;
  }
};
