
import { GoogleGenAI } from "@google/genai";
import { FinancialStats } from '../types.ts';

export const getFinancialTip = async (stats: FinancialStats, annualGoal: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const remaining = annualGoal - stats.totalRevenue;
  
  const prompt = `
    Você é o Consultor Virtual da "Hana Finance". Seu objetivo é ajudar um empresário de Home Office no Brasil.
    Sua prioridade máxima é o RIGOR na separação entre contas Pessoais e Empresariais.
    
    Dados atuais:
    - Faturamento: R$ ${stats.totalRevenue.toLocaleString('pt-BR')}
    - Pró-labore fixo: R$ ${stats.proLabore.toLocaleString('pt-BR')}
    - Leakage (Despesas Pessoais pagas pela Empresa): R$ ${stats.personalLeakedInBusiness.toLocaleString('pt-BR')} (${stats.accountMixLeakage.toFixed(1)}%)
    - Lucro Líquido Real (pós impostos e custos): R$ ${stats.realProfit.toLocaleString('pt-BR')}
    - Falta para a meta de R$ 550k: R$ ${remaining.toLocaleString('pt-BR')}

    Gere uma dica estratégica curta (2 frases). 
    Se o 'Leakage' for acima de 5%, seja firme sobre a separação de contas.
    Se o lucro for bom, sugira como distribuir nos baldes de Investimento ou Imagem Pessoal.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.8,
      }
    });
    return response.text || "Mantenha o rigor na separação das contas para proteger seu patrimônio pessoal.";
  } catch (error: any) {
    console.error("Erro no Gemini:", error);
    return `Seu vazamento pessoal está em ${stats.accountMixLeakage.toFixed(1)}%. Mantenha o foco na meta de R$ 550k!`;
  }
};
