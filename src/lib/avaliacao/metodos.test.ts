import { describe, expect, it } from "vitest";
import { calcularMetodo, lerPremissas, type PremissasMetodo } from "./metodos";
import type { Comparavel } from "./tipos";

const evolutivo: PremissasMetodo = { metodo: "evolutivo", justificativa: "Pesquisa do terreno e orçamento de reconstrução.", terreno: 300000, areaConstruida: 200, custoM2: 2000, depreciacaoPct: 20, fatorComercializacao: 1.1 };
const renda: PremissasMetodo = { metodo: "renda", justificativa: "Contratos e taxa de mercado.", aluguelMensal: 10000, vacanciaPct: 10, despesasMensais: 1000, taxaCapitalizacaoPct: 8 };
const involutivo: PremissasMetodo = { metodo: "involutivo", justificativa: "Projeto viável, receitas e custos orçados.", taxaDescontoPct: 10, lucroPct: 20, fluxo: [{ mes: 0, receita: 0, custo: 100000 }, { mes: 12, receita: 1000000, custo: 250000 }] };
const calc = (p: PremissasMetodo | undefined) => calcularMetodo(p, "venda", 80, "residencial", []);
const comp = { id: "ref", identificacao: "Referência", finalidade: "venda", tipologia: "residencial", preco: 500000, area_m2: 50, incluido: true, duplicata: false, reconferir: false, ajustes: [{ fator: "Conservação", percentual: -10, justificativa: "Diferença observada em vistoria." }] } as Comparavel;

describe("métodos de avaliação comercial", () => {
  it("preserva o modo manual e não exige premissas de avaliações antigas", () => {
    expect(calc(undefined)).toEqual({ valor: null, memoria: [], erros: [] });
  });
  it("compõe terreno, construção depreciada e fator de comercialização", () => {
    expect(calc(evolutivo).valor).toBe(682000);
  });
  it("capitaliza renda líquida anual, aplicando vacância antes das despesas", () => {
    expect(calc(renda).valor).toBe(1200000);
  });
  it("desconta cada fluxo pelo prazo mensal e reserva a margem sem repetir o custo do terreno", () => {
    expect(calc(involutivo).valor).toBe(400000);
    expect(calc({ ...involutivo, fluxo: [{ mes: 6, receita: 1000000, custo: 250000 }] }).valor).toBeCloseTo(550000 / Math.sqrt(1.1), 2);
  });
  it("usa comparáveis ajustados com a mesma finalidade e permite zero ajustes", () => {
    const p: PremissasMetodo = { metodo: "comparativo", justificativa: "Mesma região e tipologia." };
    expect(calcularMetodo(p, "venda", 80, "residencial", [comp]).valor).toBe(720000);
    expect(calcularMetodo(p, "venda", 80, "residencial", [{ ...comp, ajustes: [] }]).valor).toBe(800000);
    for (const x of [{ ...comp, finalidade: "locacao" as const }, { ...comp, duplicata: true }, { ...comp, tipologia: "terreno" as const }, { ...comp, reconferir: true }]) expect(calcularMetodo(p, "venda", 80, "residencial", [x]).valor).toBeNull();
  });
  it("mantém unidade de aluguel mensal e não retorna valor patrimonial como aluguel", () => {
    for (const p of [evolutivo, renda, involutivo]) expect(calcularMetodo(p, "locacao", 80, "residencial", []).valor).toBeNull();
    expect(calcularMetodo({ metodo: "comparativo", justificativa: "Aluguéis" }, "locacao", 80, "residencial", [{ ...comp, finalidade: "locacao", preco: 3000, ajustes: [] }]).valor).toBe(4800);
  });
  it.each([
    { ...evolutivo, depreciacaoPct: 101 }, { ...evolutivo, fatorComercializacao: 0 }, { ...evolutivo, areaConstruida: Infinity },
    { ...renda, taxaCapitalizacaoPct: 0 }, { ...renda, despesasMensais: 10000 }, { ...renda, justificativa: "" },
    { ...involutivo, fluxo: [] }, { ...involutivo, fluxo: [{ mes: 1.5, receita: 1000000, custo: 1 }] },
    { ...involutivo, fluxo: [{ mes: 1, receita: 1, custo: 1 }, { mes: 1, receita: 1, custo: 1 }] },
    { ...involutivo, fluxo: [{ mes: 0, receita: 100, custo: 1000 }] },
  ])("recusa premissa inválida ou cenário inviável %#", p => { expect(calc(p).valor).toBeNull(); expect(calc(p).erros.length).toBeGreaterThan(0); });
  it("lê decimais brasileiros sem inventar zero para texto inválido", () => {
    const f = new FormData();
    for (const [k,v] of Object.entries({ metodo: "evolutivo", premissas_justificativa: "Pesquisa", terreno: "300.000,00", areaConstruida: "200", custoM2: "2.000", depreciacaoPct: "20", fatorComercializacao: "1,1" })) f.set(k,v);
    expect(calc(lerPremissas(f)).valor).toBe(682000);
    f.set("custoM2", "abc"); expect(() => lerPremissas(f)).toThrow();
    f.set("metodo", "desconhecido"); expect(() => lerPremissas(f)).toThrow();
  });
  it("lê e valida o fluxo por linhas, com meses únicos e sem negativos", () => {
    const f = new FormData();
    for (const [k,v] of Object.entries({ metodo: "involutivo", premissas_justificativa: "Projeto", taxaDescontoPct: "10", lucroPct: "20", fluxo: "0; 0; 100.000\n12; 1.000.000; 250.000" })) f.set(k,v);
    expect(calc(lerPremissas(f)).valor).toBe(400000);
    f.set("fluxo", "0;100;abc"); expect(() => lerPremissas(f)).toThrow();
    f.set("fluxo", "0;100;-200"); expect(() => lerPremissas(f)).toThrow();
    f.set("fluxo", "0;100"); expect(() => lerPremissas(f)).toThrow();
  });
});
