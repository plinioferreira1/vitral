import { describe, expect, it } from "vitest";
import { valorEmCentavos, diasAte, ehEtapaIntermediaria, gerarLembretes, marcoVigente, mesmaEtapa, montarEmailLembretes, type ProcessoLembrete } from "./lembretes";

const proc = (x: Partial<ProcessoLembrete> = {}): ProcessoLembrete => ({
  id: "p1", tenant_id: "t1", categoria: "venda", status: "ativo", responsavel_id: "resp", numero_processo: "V-001", endereco: "SQN 312 Bloco K apto 504", data_final_contrato: null, ...x,
});
const gestores = new Map([["t1", ["dir", "ger"]]]);
const HOJE = "2026-10-15";

describe("regras básicas", () => {
  it("reconhece etapas de intermediária, inclusive o nome antigo", () => {
    expect(ehEtapaIntermediaria("Pagamento de Intermediária")).toBe(true);
    expect(ehEtapaIntermediaria("Escritura + Intermediária")).toBe(true);
    expect(ehEtapaIntermediaria("Registro")).toBe(false);
  });
  it("trata nomes antigos como a mesma etapa do catálogo", () => {
    expect(mesmaEtapa("Escritura", "Escritura + Intermediária")).toBe(true);
    expect(mesmaEtapa("Escritura", "Escritura")).toBe(true);
    expect(mesmaEtapa("Registro", "Escritura")).toBe(false);
  });
  it("conta dias e acha o marco vigente", () => {
    expect(diasAte(HOJE, "2026-11-14")).toBe(30);
    expect(marcoVigente(30, [30, 15, 7], false)).toBe(30);
    expect(marcoVigente(16, [30, 15, 7], false)).toBe(30);
    expect(marcoVigente(15, [30, 15, 7], false)).toBe(15);
    expect(marcoVigente(3, [30, 15, 7], false)).toBe(7);
    expect(marcoVigente(31, [30, 15, 7], false)).toBeNull();
    expect(marcoVigente(0, [30, 15, 7], false)).toBeNull();
    expect(marcoVigente(0, [2, 1], true)).toBe(1);
    expect(marcoVigente(-1, [2, 1], true)).toBeNull();
  });
});

describe("gerarLembretes", () => {
  it("avisa a intermediária 2 dias antes para gestão e responsável", () => {
    const r = gerarLembretes(HOJE, [{ id: "e1", nome: "Pagamento de Intermediária", status: "pendente", data_prevista: "2026-10-17", processo: proc() }], [], gestores);
    expect(r.map((l) => l.usuario_id).sort()).toEqual(["dir", "ger", "resp"]);
    expect(r[0]).toMatchObject({ tipo: "intermediaria", marco: 2, etapa_id: "e1", data_referencia: "2026-10-17" });
    expect(r[0].titulo).toBe("Intermediária em 2 dias · 17/10/2026");
    expect(r[0].mensagem).toContain("Avise o cliente");
  });
  it("na véspera usa o marco de 1 dia", () => {
    const [l] = gerarLembretes(HOJE, [{ id: "e1", nome: "Escritura + Intermediária", status: "pendente", data_prevista: "2026-10-16", processo: proc({ responsavel_id: null }) }], [], gestores);
    expect(l).toMatchObject({ marco: 1 });
    expect(l.titulo).toContain("amanhã");
  });
  it("não avisa etapa concluída, sem data, distante ou de venda encerrada", () => {
    const base = { id: "e", nome: "Pagamento de Intermediária", processo: proc() };
    expect(gerarLembretes(HOJE, [
      { ...base, status: "concluida", data_prevista: "2026-10-16" },
      { ...base, status: "pendente", data_prevista: null },
      { ...base, status: "pendente", data_prevista: "2026-10-20" },
      { ...base, status: "pendente", data_prevista: "2026-10-16", processo: proc({ status: "concluido" }) },
      { ...base, status: "pendente", data_prevista: "2026-10-16", processo: proc({ categoria: "financiamento" }) },
    ], [], gestores)).toEqual([]);
  });
  it("avisa o fim do contrato nos marcos de 30, 15 e 7 dias", () => {
    const em = (d: string) => gerarLembretes(HOJE, [], [proc({ data_final_contrato: d })], gestores);
    expect(em("2026-11-14")[0]).toMatchObject({ tipo: "fim_contrato", marco: 30 });
    expect(em("2026-10-30")[0]).toMatchObject({ marco: 15 });
    expect(em("2026-10-22")[0].titulo).toBe("Contrato termina em 7 dias · 22/10/2026");
    expect(em("2026-11-20")).toEqual([]);
    expect(em("2026-10-15")).toEqual([]);
  });
  it("não duplica o destinatário quando o responsável é da gestão", () => {
    const r = gerarLembretes(HOJE, [], [proc({ responsavel_id: "dir", data_final_contrato: "2026-10-22" })], gestores);
    expect(r).toHaveLength(2);
  });
});

describe("montarEmailLembretes", () => {
  it("lista intermediárias primeiro, com link e texto escapado", () => {
    const { assunto, html, texto } = montarEmailLembretes("Amanda Martins", [
      { tipo: "fim_contrato", titulo: "Contrato termina em 7 dias", mensagem: "A <b>", processo_id: "p2" },
      { tipo: "intermediaria", titulo: "Intermediária amanhã", mensagem: "B", processo_id: "p1" },
    ], "https://vitral.exemplo");
    expect(assunto).toBe("Vitral · 2 lembretes de vendas");
    expect(html.indexOf("Intermediária amanhã")).toBeLessThan(html.indexOf("Contrato termina"));
    expect(html).toContain("A &lt;b&gt;");
    expect(html).toContain("https://vitral.exemplo/processos/p1");
    expect(texto).toContain("Olá, Amanda Martins.");
  });
});

describe("valor da intermediária", () => {
  it("converte o valor do campo com máscara e o digitado", () => {
    expect(valorEmCentavos("50000.00")).toBe(5_000_000);
    expect(valorEmCentavos("50.000,00")).toBe(5_000_000);
    expect(valorEmCentavos("1234,5")).toBe(123_450);
    expect(valorEmCentavos("")).toBeNull();
    expect(valorEmCentavos("0.00")).toBeNull();
    expect(valorEmCentavos("abc")).toBeUndefined();
    expect(valorEmCentavos("-10")).toBeUndefined();
  });
  it("mostra o valor no título e na mensagem do lembrete", () => {
    const [l] = gerarLembretes(HOJE, [{ id: "e1", nome: "Pagamento de Intermediária", status: "pendente", data_prevista: "2026-10-17", valor_centavos: 5_000_000, processo: proc() }], [], gestores);
    expect(l.titulo).toBe("Intermediária em 2 dias · 17/10/2026 · R$\u00a050.000,00");
    expect(l.mensagem).toContain("de R$\u00a050.000,00 prevista para 17/10/2026");
  });
});
