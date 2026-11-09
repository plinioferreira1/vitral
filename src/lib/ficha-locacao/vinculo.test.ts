import { describe, expect, it } from "vitest";
import { decidirRetomada, nomeCombina, titularUnico } from "./vinculo";

describe("vínculo pelo nome do titular", () => {
  it("aceita nome completo, sem acento, ou parte do nome na ordem", () => {
    expect(nomeCombina("Maria de Fátima Souza", "Maria de Fatima Souza")).toBe(true);
    expect(nomeCombina("maria souza", "Maria de Fátima Souza")).toBe(true);
    expect(nomeCombina("Maria Fátima", "Maria de Fátima Souza")).toBe(true);
    expect(nomeCombina("  MARIA   SOUZA ", "Maria de Fátima Souza")).toBe(true);
  });
  it("recusa só o primeiro nome, ordem trocada ou outro primeiro nome", () => {
    expect(nomeCombina("Maria", "Maria Souza")).toBe(false);
    expect(nomeCombina("Souza Maria", "Maria Souza")).toBe(false);
    expect(nomeCombina("Mariana Souza", "Maria Souza")).toBe(false);
    expect(nomeCombina("Maria Silva", "Maria Souza")).toBe(false);
  });
  it("só vincula quando um único titular combina", () => {
    const t = [{ id: "1", nome: "Maria de Fátima Souza" }, { id: "2", nome: "Maria Souza Lima" }, { id: "3", nome: "João Pedro Alves" }];
    expect(titularUnico("João Alves", t)?.id).toBe("3");
    expect(titularUnico("Maria Souza", t)).toBeNull();
    expect(titularUnico("Maria Fátima Souza", t)?.id).toBe("1");
    expect(titularUnico("Carlos Lima", t)).toBeNull();
  });
});

describe("fiador que volta para terminar a ficha", () => {
  const f = (id: string, status: string, cpf: string) => ({ id, token: `t-${id}`, status, cpf });
  it("mesmo CPF continua a ficha em andamento", () => {
    expect(decidirRetomada("123.456.789-09", [f("a", "rascunho", "12345678909")], null)).toEqual({ acao: "continuar", token: "t-a" });
  });
  it("ficha já enviada não abre de novo", () => {
    expect(decidirRetomada("12345678909", [f("a", "concluida", "12345678909")], null)).toEqual({ acao: "enviada" });
    expect(decidirRetomada("12345678909", [], f("b", "concluida", "98765432100"))).toEqual({ acao: "enviada" });
  });
  it("rascunho vazio na mesma vaga é substituído; vaga de outra pessoa fica protegida", () => {
    expect(decidirRetomada("12345678909", [], f("b", "aguardando", ""))).toEqual({ acao: "nova", substituir: "b" });
    expect(decidirRetomada("12345678909", [], f("b", "rascunho", "98765432100"))).toEqual({ acao: "ocupada" });
    expect(decidirRetomada("12345678909", [], null)).toEqual({ acao: "nova", substituir: null });
  });
});
