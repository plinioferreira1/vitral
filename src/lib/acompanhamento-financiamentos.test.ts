import { describe, expect, it } from "vitest";
import { etapasAtuais, type EtapaAcompanhamento } from "./acompanhamento-financiamentos";

const etapa = (props: Partial<EtapaAcompanhamento>): EtapaAcompanhamento => ({
  processo_id: "p1", nome: "Análise", status: "pendente", ordem: 1,
  especial: false, data_prevista: null, usuarios: null, ...props,
});

describe("etapasAtuais", () => {
  it("escolhe a primeira etapa sequencial ainda aberta, mesmo fora de ordem", () => {
    const rows = [etapa({ ordem: 3 }), etapa({ ordem: 1, status: "concluida" }), etapa({ ordem: 2, nome: "Documentação", status: "bloqueada" })];
    expect(etapasAtuais(rows).p1.nome).toBe("Documentação");
    expect(rows[0].ordem).toBe(3);
  });
  it("ignora etapas especiais e não inventa etapa para processos finalizados", () => {
    expect(etapasAtuais([etapa({ especial: true }), etapa({ status: "concluida" })])).toEqual({});
  });
  it("preserva prazo e responsável de cada processo", () => {
    const rows = [etapa({ data_prevista: "2026-10-06", usuarios: { nome: "Responsável A" } }), etapa({ processo_id: "p2", nome: "Registro" })];
    expect(etapasAtuais(rows).p1).toEqual(rows[0]);
    expect(etapasAtuais(rows).p2.nome).toBe("Registro");
  });
});
