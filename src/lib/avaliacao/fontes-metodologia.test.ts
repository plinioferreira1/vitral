import { describe, expect, it } from "vitest";
import { fontesEMetodologia } from "./fontes-metodologia";
import type { Comparavel } from "./tipos";

const base = { finalidade: "venda", incluido: true, tipo_preco: "oferta", fonte_tipo: "manual", fonte_nome: null, fonte_url: null, data_coleta: "2026-10-01", ajustes: [] } as unknown as Comparavel;
const c = (p: Partial<Comparavel>) => ({ ...base, ...p }) as Comparavel;

describe("fontes, metodologia e limitações", () => {
  it("lista as fontes reais com contagem e a amostra usada", () => {
    const b = fontesEMetodologia({
      comparaveis: [
        c({ fonte_url: "https://www.dfimoveis.com.br/x" }),
        c({ fonte_url: "https://www.dfimoveis.com.br/y", data_coleta: "2026-10-20" }),
        c({ fonte_nome: "Base Sacra" }),
        c({ incluido: false }),
        c({ finalidade: "locacao" }),
      ],
      finalidade: "venda",
      metodo: "comparativo",
      vistoriaRealizada: false,
      dataBase: "2026-10-28",
    });
    expect(b.fontes[0]).toBe("dfimoveis.com.br (2 referências)");
    expect(b.fontes).toContain("Base Sacra (1 referência)");
    expect(b.amostra).toBe("3 de 4 referências levantadas, consultadas entre 01/10/2026 e 20/10/2026.");
    expect(b.metodologia[0]).toMatch(/comparativo direto.*NBR 14\.653-2/);
    expect(b.metodologia.join(" ")).not.toMatch(/regress|Chauvenet|Kaplan/i);
    expect(b.limitacoes.join(" ")).toMatch(/não inclui vistoria/);
    expect(b.limitacoes.at(-1)).toMatch(/28\/10\/2026/);
  });
  it("valor manual sem comparáveis não cita norma nem amostra", () => {
    const b = fontesEMetodologia({ comparaveis: [], finalidade: "venda", metodo: "manual", vistoriaRealizada: true, dataBase: null });
    expect(b.amostra).toBeNull();
    expect(b.metodologia[0]).toMatch(/conhecimento de mercado/);
    expect(b.metodologia.join(" ")).not.toMatch(/NBR/);
    expect(b.fontes[0]).toMatch(/Vistoria/);
  });
  it("menciona homogeneização só quando há ajustes", () => {
    const b = fontesEMetodologia({ comparaveis: [c({ ajustes: [{ fator: "Andar", percentual: 5, justificativa: "x" }] })], finalidade: "venda", metodo: "comparativo", vistoriaRealizada: false, dataBase: null });
    expect(b.metodologia.join(" ")).toMatch(/Homogeneização/);
  });
});
