import { describe, expect, it } from "vitest";
import { montarHtmlResumoMatutino, type ResumoMatutino } from "./resumo-matutino";

const dados: ResumoMatutino = {
  dia:"2026-11-25", nome:"Gestor Teste",
  financeiro:{
    saldo:1500.5,
    pagarHoje:[{id:"1",tipo:"despesa",descricao:"Condomínio",vencimento:"2026-11-25",valor:300}],
    receberHoje:[],
    vencidos:[{id:"2",tipo:"receita",descricao:"Aluguel em atraso",vencimento:"2026-11-20",valor:800}]
  },
  demandas:{
    hoje:[{id:"123",titulo:"Assinar <contrato>",prazo:"2026-11-25",prioridade:"urgente"}],
    vencidas:[],outras:[]
  },
  processos:{
    processosEmAndamento:1,atrasadas:[],hoje:[],proximos:[],
    prazosContrato:[{processoId:"456",imovel:"Casa Exemplo",categoria:"venda",data:"2026-12-10",dias:15}]
  },
  vendas:[{processo_id:"456",titulo:"Contrato termina em 15 dias",mensagem:"Prazo final em breve"}]
};

describe("resumo matutino unificado",()=>{
  it("inclui os quatro relatórios numa única mensagem",()=>{
    const html=montarHtmlResumoMatutino(dados);
    for (const secao of ["Financeiro","Minhas demandas","Processos e prazos","Lembretes de vendas"])
      expect(html).toContain(secao);
    expect(html.replace(/\\u00a0/g, " ")).toContain("R$ 1.500,50");
    expect(html).toContain("Condomínio");
    expect(html).toContain("Casa Exemplo");
  });
  it("escapa conteúdo de usuário sem criar markup arbitrário",()=>{
    const html=montarHtmlResumoMatutino(dados);
    expect(html).toContain("&lt;contrato&gt;");
    expect(html).not.toContain("<contrato>");
  });
  it("distingue conta vencida de recebimento vencido",()=>{
    const html=montarHtmlResumoMatutino(dados);
    expect(html).toContain("Recebimentos vencidos:");
    expect(html).toContain("Despesas vencidas:");
  });
  it("identifica explicitamente a versão de teste",()=>{
    expect(montarHtmlResumoMatutino(dados)).toContain("Versão de teste");
  });
});
