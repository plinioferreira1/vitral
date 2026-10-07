import { describe, expect, it } from "vitest";
import { SECOES, anexosDe, cpfValido, limparDados, pendencias, secoesVisiveis, textoPendencias, tipoLocatario, type DadosFicha } from "./campos";

const completa: DadosFicha = {
  imovel_interesse: "SQN 208 Bloco E, apto. 502", valor_proposta: "R$ 3.500,00", finalidade: "Residencial", garantia: "Seguro Fiança",
  nome_completo: "Maria Teste", cpf: "529.982.247-25", rg: "123456 SSP/DF", nascimento: "1990-04-12", nacionalidade: "Brasileira", naturalidade: "Salvador/BA",
  estado_civil: "Solteiro(a)", dependentes: "Nenhum", filiacao: "Ana Teste e João Teste", telefone: "(61) 99999-0000", email: "maria@exemplo.com",
  endereco: "Rua 1, casa 2", cep: "70000-000", cidade: "Brasília", uf: "DF", moradia_tipo: "Cedido / de familiares",
  tipo_renda: "Assalariado(a)", profissao: "Analista", empresa: "Empresa X", cargo: "Analista sênior", data_admissao: "2020-01-15", empresa_endereco: "SCS Quadra 1", empresa_telefone: "(61) 3333-0000", renda_mensal: "R$ 9.000,00",
  banco: "Banco do Brasil", agencia: "1234", conta_abertura: "03/2015", agencia_cidade: "Brasília",
  referencia_nome: "José Amigo", referencia_parentesco: "Amigo", referencia_telefone: "(61) 98888-0000", referencia_endereco: "Rua 3",
};

describe("ficha cadastral de locação", () => {
  it("não repete chave de campo", () => {
    const chaves = SECOES.flatMap((s) => s.campos.map((c) => c.chave));
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("confere CPF pelos dígitos verificadores", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("529.982.247-26")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("123")).toBe(false);
  });

  it("aceita uma ficha de titular completa", () => {
    expect(pendencias(completa, "titular")).toEqual([]);
  });

  it("aponta o que falta, por etapa", () => {
    const d = { ...completa, valor_proposta: "", nacionalidade: " ", cpf: "111.111.111-11" };
    expect(pendencias(d, "titular", 0).map((p) => p.chave)).toEqual(["valor_proposta"]);
    expect(pendencias(d, "titular", 1)).toEqual([
      { chave: "cpf", rotulo: "CPF", etapa: 1, motivo: "invalido" },
      { chave: "nacionalidade", rotulo: "Nacionalidade", etapa: 1, motivo: "faltando" },
    ]);
    expect(textoPendencias(pendencias(d, "titular", 1))).toBe("Preencha: Nacionalidade. Confira: CPF.");
  });

  it("exige dados do cônjuge só para casado ou união estável", () => {
    expect(pendencias({ ...completa, estado_civil: "Casado(a)" }, "titular").map((p) => p.chave)).toEqual(["conjuge_nome", "conjuge_cpf"]);
    expect(pendencias({ ...completa, estado_civil: "Viúvo(a)" }, "titular")).toEqual([]);
  });

  it("dados da empresa são obrigatórios para assalariado e empresário, não para aposentado", () => {
    const semEmpresa = { ...completa, cargo: "", data_admissao: "", empresa_endereco: "", empresa_telefone: "" };
    expect(pendencias(semEmpresa, "titular").map((p) => p.chave)).toEqual(["cargo", "data_admissao", "empresa_endereco", "empresa_telefone"]);
    expect(pendencias({ ...semEmpresa, tipo_renda: "Aposentado(a)" }, "titular")).toEqual([]);
  });

  it("garantia Fiador pede só o contato do fiador ao titular", () => {
    const d = { ...completa, garantia: "Fiador" };
    expect(pendencias(d, "titular").map((p) => p.chave)).toEqual(["fiador_nome", "fiador_telefone"]);
    expect(secoesVisiveis(d, "titular", 0).map((s) => s.id)).toEqual(["proposta", "fiador_indicado", "corresponsavel_indicado"]);
  });

  it("corresponsável só é pedido quando o titular diz que haverá", () => {
    expect(pendencias({ ...completa, tem_corresponsavel: "Sim" }, "titular").map((p) => p.chave)).toEqual(["corresponsavel_nome", "corresponsavel_telefone"]);
    expect(pendencias({ ...completa, tem_corresponsavel: "Não" }, "titular")).toEqual([]);
  });

  it("fiador e corresponsável não respondem a proposta", () => {
    const pessoa = Object.fromEntries(Object.entries(completa).filter(([k]) => !["imovel_interesse", "valor_proposta", "finalidade", "garantia"].includes(k)));
    expect(secoesVisiveis(pessoa, "fiador", 0)).toEqual([]);
    expect(pendencias(pessoa, "corresponsavel")).toEqual([]);
    // do fiador, a ficha quer saber do imóvel
    expect(pendencias(pessoa, "fiador").map((p) => p.chave)).toEqual(["imovel_proprio"]);
    expect(pendencias({ ...pessoa, imovel_proprio: "Sim — quitado" }, "fiador").map((p) => p.chave)).toEqual(["bem_imovel_endereco"]);
  });

  it("grava só o que a ficha conhece — número de conta e campos escondidos ficam de fora", () => {
    const limpo = limparDados({ ...completa, conta: "12345-6", campo_estranho: "x", conjuge_nome: "Fulano", veiculo_prestacao: "R$ 900,00", consentimento_lgpd: true }, "titular");
    expect(limpo.conta).toBeUndefined();
    expect(limpo.campo_estranho).toBeUndefined();
    expect(limpo.conjuge_nome).toBeUndefined(); // solteira
    expect(limpo.veiculo_prestacao).toBeUndefined(); // sem veículo
    expect(limpo.consentimento_lgpd).toBe(true);
    expect(limpo.nome_completo).toBe("Maria Teste");
    expect(limparDados({ ...completa, garantia: "Fiador" }, "fiador").garantia).toBeUndefined();
  });

  it("monta a lista de anexos conforme a pessoa, a garantia e a renda", () => {
    expect(anexosDe("titular", "Seguro Fiança", completa)).toContain("Última fatura do cartão de crédito");
    expect(anexosDe("titular", "Título de Capitalização", completa)).toContain("6 últimos contracheques");
    const fiador = anexosDe("fiador", "Fiador", { ...completa, estado_civil: "Casado(a)", tipo_renda: "Empresário(a)", imovel_proprio: "Sim — quitado" });
    expect(fiador).toContain("Escritura e certidão de ônus do imóvel");
    expect(fiador).toContain("CPF e RG do cônjuge");
    expect(fiador).toContain("Contrato social, extratos PJ, pró-labore e DECORE");
    expect(fiador).not.toContain("Última fatura do cartão de crédito");
    expect(fiador.at(-1)).toBe("Outros documentos");
  });

  it("tipo de locatário desconhecido vira o padrão", () => {
    expect(tipoLocatario("fiador")).toBe("fiador");
    expect(tipoLocatario("dono")).toBe("titular");
    expect(tipoLocatario(null, "corresponsavel")).toBe("corresponsavel");
  });
});

describe("complementos da revisão", () => {
  it("valida datas reais e valores positivos", () => {
    const d = { ...completa, nascimento: "1990-02-31", valor_proposta: "R$ 0,00", renda_mensal: "negativo" };
    expect(pendencias(d, "titular").map((p) => p.chave)).toEqual(["valor_proposta", "nascimento", "renda_mensal"]);
  });
  it("não exige abertura da conta e endereço de referência para todos", () => {
    expect(pendencias({ ...completa, conta_abertura: "", referencia_endereco: "" }, "titular")).toEqual([]);
  });
  it("exige a origem da renda complementar e preserva a justificativa documental", () => {
    expect(pendencias({ ...completa, outros_rendimentos: "R$ 1.000,00" }, "titular").map((p) => p.chave)).toEqual(["outros_rendimentos_origem"]);
    expect(limparDados({ ...completa, ir_nao_aplicavel: "Não declaro imposto de renda." }, "titular").ir_nao_aplicavel).toBe("Não declaro imposto de renda.");
  });
});
