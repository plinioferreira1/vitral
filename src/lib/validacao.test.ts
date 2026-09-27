import { describe, expect, it, vi } from "vitest";

// aviso.ts importa next/headers (só usado dentro de Server Actions).
vi.mock("next/headers", () => ({ cookies: async () => ({ set: () => {} }) }));

import { valorDaLista } from "./validacao";
import { traduzirErro, lerAviso } from "./aviso";
import { objetoParcial, objetoVazio } from "./objeto-parcial";

describe("valorDaLista", () => {
  it("aceita só valores da lista do banco", () => {
    expect(valorDaLista("financeiro_tipo_categoria", "receita", "despesa")).toBe("receita");
    expect(valorDaLista("financeiro_tipo_categoria", " receita ", "despesa")).toBe("receita");
    expect(valorDaLista("financeiro_tipo_categoria", "hackeado", "despesa")).toBe("despesa");
    expect(valorDaLista("categoria_processo", null)).toBeNull();
    expect(valorDaLista("tipo_conta_locacao", "agua")).toBe("agua");
  });
});

describe("traduzirErro", () => {
  it("traduz os erros comuns do banco", () => {
    expect(traduzirErro({ code: "23505", message: "duplicate key value" })).toMatch(/já existe/);
    expect(traduzirErro({ code: "42501", message: "new row violates row-level security policy" })).toMatch(/permissão/);
    expect(traduzirErro({ code: "23503", message: "violates foreign key constraint" })).toMatch(/ligado a outros dados/);
    expect(traduzirErro({ code: "23502", message: "null value in column" })).toMatch(/obrigatório/);
    expect(traduzirErro({ message: "algo estranho" })).toBe("algo estranho");
  });
});

describe("lerAviso", () => {
  it("lê o aviso gravado e ignora lixo", () => {
    const aviso = { id: "1", tipo: "erro", mensagem: "Não foi possível salvar" };
    expect(lerAviso(encodeURIComponent(JSON.stringify(aviso)))).toEqual(aviso);
    expect(lerAviso("%%%")).toBeNull();
    expect(lerAviso(undefined)).toBeNull();
  });
});

describe("objetoParcial", () => {
  it("descarta campos vazios para não apagar dados já salvos", () => {
    expect(objetoParcial({ telefone: "", email: "a@b.com", rg: null, numero: 0 })).toEqual({ email: "a@b.com", numero: 0 });
    expect(objetoVazio(objetoParcial({ a: null, b: "" }))).toBe(true);
  });
});
