
import { GoogleGenAI } from "@google/genai";
import { FinancialStats } from '../types.ts';

export const getFinancialTip = async (stats: FinancialStats, annualGoal: number) => {
  // We initialize the AI right before the call to ensure it uses the latest selected key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const remaining = annualGoal - stats.totalRevenue;
  
  const prompt = `
    Você é um CFO (Chief Financial Officer) sênior de uma empresa de serviços Home Office.
    Sua tarefa é dar conselhos de alta performance.
    
    Dados atuais:
    - Faturamento: R$ ${stats.totalRevenue.toLocaleString('pt-BR')}
    - Meta Anual: R$ ${annualGoal.toLocaleString('pt-BR')}
    - Lucro Real: R$ ${stats.realProfit.toLocaleString('pt-BR')}
    - Leakage (Pessoais na PJ): ${stats.accountMixLeakage.toFixed(1)}%
    - Falta para a meta: R$ ${remaining.toLocaleString('pt-BR')}

    Gere uma dica técnica de 2 a 3 frases. 
    Foque em: Otimização de impostos, separação de contas ou como acelerar o alcance da meta de R$ 550k para ganhar a viagem de Portugal.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded to Pro
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.8,
      }
    });
    return response.text || "Mantenha o rigor na separação das contas para proteger seu patrimônio pessoal.";
  } catch (error: any) {
    console.error("Erro no Gemini:", error);
    if (error?.message?.includes("entity was not found")) {
       return "NECESSÁRIO_CHAVE"; // Trigger for API Key re-selection
    }
    return `Faltam R$ ${remaining.toLocaleString('pt-BR')} para Noronha. Continue faturando!`;
  }
};
