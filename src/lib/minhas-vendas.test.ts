import { describe, expect, it } from "vitest";
import { listarComissoes, resumoComissoes, valorComissao, filtrarVendas, resumoVenda, type VendaCorretor } from "./minhas-vendas";
const venda: VendaCorretor = { id:"a", numero:"001",status:"ativo",imovel:null,comprador:null,vendedor:null,responsavel:null,prazo_contrato:"2026-10-20",assinatura_contrato:null,atualizacoes:[],etapas:[{id:"1",nome:"Contrato",status:"concluida",prevista:"2026-09-01",realizada:"2026-09-01",ordem:0},{id:"2",nome:"Registro",status:"em_andamento",prevista:"2026-10-05",realizada:null,ordem:1}] };
describe("acompanhamento das próprias vendas",()=>{
 it("distingue atraso de etapa e prazo contratual",()=>{expect(resumoVenda(venda,"2026-10-07")).toMatchObject({etapaVencida:true,contratoVencido:false,concluidas:1});});
 it("não trata concluídas ou prazo de hoje como vencidos",()=>{expect(resumoVenda({...venda,status:"concluido"},"2026-10-30")).toMatchObject({etapaVencida:false,contratoVencido:false});expect(resumoVenda(venda,"2026-10-05").etapaVencida).toBe(false);});
 it("não inventa prazos onde não foram definidos",()=>{expect(resumoVenda({...venda,prazo_contrato:null,etapas:[]},"2026-10-07")).toMatchObject({atual:null,proximo:null,etapaVencida:false,contratoVencido:false});});
 it("filtra atrasadas e concluídas sem incluir canceladas",()=>{const concluida={...venda,id:"b",status:"concluido"};const cancelada={...venda,id:"c",status:"cancelado"};expect(filtrarVendas([venda,concluida,cancelada],"andamento","2026-10-07").map(v=>v.id)).toEqual(["a"]);expect(filtrarVendas([venda,concluida],"concluidas","2026-10-07").map(v=>v.id)).toEqual(["b"]);});
});

describe("controle de comissões", () => {
 const registros = [ { ...venda, status: "concluido", comissoes: [{ id: "c", status: "50% pago", valor_previsto: 1000, valor_recebido: null, data_prevista: null, data_recebida: null }] }, { ...venda, comissoes: [{ id: "p", status: "100% pago", valor_previsto: 500, valor_recebido: 500, data_prevista: null, data_recebida: "2026-10-07" }] } ];
 it("inclui comissões pendentes mesmo com venda concluída", () => { expect(listarComissoes(registros, "pendentes").map(r => r.comissao.id)).toEqual(["c"]); });
 it("conta os pagamentos sem deduzir valores não registrados", () => { expect(resumoComissoes(registros)).toEqual({ pendentes: 0, parciais: 1, pagas: 1 }); expect(valorComissao(null)).toBe("Não informado"); expect(valorComissao(0)).toContain("0,00"); });
 it("tolera vendas sem cadastro e filtra pagas", () => { expect(listarComissoes([venda])).toEqual([]); expect(listarComissoes(registros,"100% pago").map(r => r.comissao.id)).toEqual(["p"]); });
});
