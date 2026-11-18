import {describe,it,expect} from "vitest";
import {validarLote,dataValida,type TarefaRevisada} from "../validacao";
const base:TarefaRevisada={
  titulo:"Solicitar certidão atualizada",
  responsavel_id:"11111111-2222-4333-8444-555555555555",
  prazo:"2026-11-18",prioridade:"normal",descricao:null,
};
describe("Distribuição de demandas",()=>{
  it("aceita datas YYYY-MM-DD e tarefas revisadas",()=>{
    expect(validarLote([base])).toEqual([]);
    expect(dataValida("2026-11-18")).toBe(true);
  });
  it("rejeita datas inexistentes",()=>{
    expect(dataValida("2026-02-30")).toBe(false);
    expect(validarLote([{...base,prazo:"amanhã"}])[0].campos).toContain("Prazo inválido");
  });
  it("mostra qual tarefa está sem responsável ou título",()=>{
    const erros=validarLote([base,{...base,titulo:"oi",responsavel_id:""}]);
    expect(erros).toHaveLength(1);
    expect(erros[0].indice).toBe(1);
    expect(erros[0].campos).toContain("Escolha um responsável");
  });
});
