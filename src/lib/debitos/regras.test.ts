import { describe, expect, it } from "vitest";
import {
  acaoNecessaria,
  agruparPorAdministradora,
  chaveVerificacao,
  competenciaDe,
  competenciaNaPeriodicidade,
  descreverUnidade,
  filtrarLinhas,
  montarAvisosDebitos,
  montarMensagem,
  normalizarCompetencia,
  planejarGeracao,
  podeMarcarSemDebitoEmLote,
  resumirPainel,
  rotuloCompetencia,
  rotuloCompetenciaCurto,
  situacaoSolicitacao,
  somarMeses,
  type ContratoParaGeracao,
  type LinhaPainel,
  type UnidadeSolicitacao,
} from "./regras";
import { permissoesDebitos } from "./permissoes";
import { inscricaoParaCopiar, obterProvedorTributos, URL_CONSULTA_IPTU_DF } from "./tributos";

describe("competência", () => {
  it("é sempre o dia 1º do mês", () => {
    expect(competenciaDe("2026-10-05")).toBe("2026-10-01");
    expect(normalizarCompetencia("2026-10")).toBe("2026-10-01");
    expect(normalizarCompetencia("2026-10-17")).toBe("2026-10-01");
    expect(normalizarCompetencia("2026-13")).toBeNull();
    expect(normalizarCompetencia("outubro")).toBeNull();
  });
  it("rótulos e soma de meses atravessando o ano", () => {
    expect(rotuloCompetencia("2026-10-01")).toBe("Outubro/2026");
    expect(rotuloCompetenciaCurto("2026-10-01")).toBe("OUT/2026");
    expect(somarMeses("2026-12-01", 1)).toBe("2027-01-01");
    expect(somarMeses("2026-01-01", -1)).toBe("2025-12-01");
  });
  it("periodicidade: mensal sempre; trimestral em jan, abr, jul, out", () => {
    expect(competenciaNaPeriodicidade("2026-11-01", 1)).toBe(true);
    expect(["01", "04", "07", "10"].every((m) => competenciaNaPeriodicidade(`2026-${m}-01`, 3))).toBe(true);
    expect(competenciaNaPeriodicidade("2026-11-01", 3)).toBe(false);
    expect(competenciaNaPeriodicidade("2026-01-01", 12)).toBe(true);
    expect(competenciaNaPeriodicidade("2026-06-01", 12)).toBe(false);
  });
});

describe("geração mensal sem duplicidade", () => {
  const contratos: ContratoParaGeracao[] = [
    { id: "c1", imovel_id: "i1", possui_condominio: true, administradora_id: "a1" },
    { id: "c2", imovel_id: "i2", possui_condominio: false, administradora_id: null },
    { id: "c3", imovel_id: "i3", possui_condominio: null, administradora_id: null },
  ];
  const opcoes = { periodicidadeCondominio: 1, periodicidadeIptu: 1 };

  it("cria condomínio e IPTU/TLP para cada contrato ativo", () => {
    const novas = planejarGeracao(contratos, "2026-10-01", new Set(), opcoes);
    expect(novas).toHaveLength(6);
    expect(novas.find((n) => n.contrato_id === "c1" && n.tipo === "condominio")).toMatchObject({ status: "pendente", administradora_id: "a1" });
    expect(novas.find((n) => n.contrato_id === "c1" && n.tipo === "iptu_tlp")).toMatchObject({ status: "pendente", administradora_id: null });
  });

  it("imóvel sem condomínio nasce como 'não se aplica'", () => {
    const novas = planejarGeracao(contratos, "2026-10-01", new Set(), opcoes);
    expect(novas.find((n) => n.contrato_id === "c2" && n.tipo === "condominio")?.status).toBe("nao_se_aplica");
    expect(novas.find((n) => n.contrato_id === "c3" && n.tipo === "condominio")?.status).toBe("pendente");
  });

  it("rodar de novo não cria nada; contrato novo recebe só o que falta", () => {
    const primeira = planejarGeracao(contratos, "2026-10-01", new Set(), opcoes);
    const existentes = new Set(primeira.map((n) => chaveVerificacao(n.contrato_id, n.tipo, n.competencia)));
    expect(planejarGeracao(contratos, "2026-10-01", existentes, opcoes)).toEqual([]);
    const comNovo = [...contratos, { id: "c4", imovel_id: "i4", possui_condominio: true, administradora_id: "a1" }];
    expect(planejarGeracao(comNovo, "2026-10-01", existentes, opcoes).map((n) => n.contrato_id)).toEqual(["c4", "c4"]);
    // outra competência é outro conjunto: o histórico anterior não é tocado
    expect(planejarGeracao(contratos, "2026-11-01", existentes, opcoes)).toHaveLength(6);
  });

  it("contrato repetido na entrada não duplica", () => {
    expect(planejarGeracao([contratos[0], contratos[0]], "2026-10-01", new Set(), opcoes)).toHaveLength(2);
  });

  it("respeita a periodicidade de cada tipo, salvo geração manual", () => {
    const tri = { periodicidadeCondominio: 1, periodicidadeIptu: 3 };
    expect(planejarGeracao(contratos, "2026-11-01", new Set(), tri).every((n) => n.tipo === "condominio")).toBe(true);
    expect(planejarGeracao(contratos, "2026-10-01", new Set(), tri)).toHaveLength(6);
    expect(planejarGeracao(contratos, "2026-11-01", new Set(), { ...tri, ignorarPeriodicidade: true })).toHaveLength(6);
  });
});

function unidade(p: Partial<UnidadeSolicitacao> & { verificacaoId: string }): UnidadeSolicitacao {
  return {
    contratoId: `c-${p.verificacaoId}`,
    imovel: `Imóvel ${p.verificacaoId}`,
    condominioNome: null,
    bloco: null,
    unidade: null,
    codigoUnidade: null,
    administradoraId: "abc",
    administradoraNome: "Administradora ABC",
    metodo: "email",
    emailAdministradora: "debitos@abc.example",
    emailUnidade: null,
    ...p,
  };
}

describe("unidades e agrupamento por administradora", () => {
  it("descreve a unidade com o que estiver cadastrado", () => {
    expect(descreverUnidade(unidade({ verificacaoId: "1", condominioNome: "Condomínio X", bloco: "B", unidade: "304", codigoUnidade: "987654" }))).toBe(
      "Condomínio X\nBloco B, unidade 304 (código 987654)"
    );
    expect(descreverUnidade(unidade({ verificacaoId: "2", condominioNome: "Condomínio Y", unidade: "1205" }))).toBe("Condomínio Y\nUnidade 1205");
    expect(descreverUnidade(unidade({ verificacaoId: "3" }))).toBe("Imóvel 3");
    expect(descreverUnidade(unidade({ verificacaoId: "4", unidade: "12" }))).toBe("Imóvel 4\nUnidade 12");
  });

  it("um único e-mail por administradora, com todas as unidades", () => {
    const { grupos, semEnvio } = agruparPorAdministradora(
      [
        ...Array.from({ length: 7 }, (_, i) => unidade({ verificacaoId: `abc${i}` })),
        unidade({ verificacaoId: "z1", administradoraId: "zeta", administradoraNome: "Zeta Condomínios", emailAdministradora: "sac@zeta.example" }),
      ],
      { somenteMetodoEmail: true }
    );
    expect(semEnvio).toEqual([]);
    expect(grupos.map((g) => [g.administradoraNome, g.destinatario, g.unidades.length])).toEqual([
      ["Administradora ABC", "debitos@abc.example", 7],
      ["Zeta Condomínios", "sac@zeta.example", 1],
    ]);
  });

  it("unidade com e-mail específico vai em mensagem própria", () => {
    const { grupos } = agruparPorAdministradora([unidade({ verificacaoId: "1" }), unidade({ verificacaoId: "2", emailUnidade: "Sindico@Predio.example" })], {
      somenteMetodoEmail: true,
    });
    expect(grupos.map((g) => g.destinatario).sort()).toEqual(["debitos@abc.example", "sindico@predio.example"]);
  });

  it("fica de fora, com o motivo: sem administradora, portal (no automático) e sem e-mail", () => {
    const entrada = [
      unidade({ verificacaoId: "1", administradoraId: null }),
      unidade({ verificacaoId: "2", metodo: "portal" }),
      unidade({ verificacaoId: "3", emailAdministradora: "não tem" }),
    ];
    const automatico = agruparPorAdministradora(entrada, { somenteMetodoEmail: true });
    expect(automatico.grupos).toEqual([]);
    expect(automatico.semEnvio.map((s) => s.motivo)).toEqual([
      "sem administradora vinculada",
      "administradora não é consultada por e-mail",
      "administradora sem e-mail cadastrado",
    ]);
    // envio manual de selecionados pode incluir administradora de portal que tenha e-mail
    expect(agruparPorAdministradora(entrada, { somenteMetodoEmail: false }).grupos).toHaveLength(1);
  });
});

describe("mensagem", () => {
  const unidades = [
    unidade({ verificacaoId: "1", condominioNome: "Condomínio X", bloco: "A", unidade: "101" }),
    unidade({ verificacaoId: "2", condominioNome: "Condomínio Y", unidade: "1205" }),
  ];
  const dados = { unidades, competencia: "2026-10-01", administradora: "Administradora ABC" };

  it("modelo padrão com a relação das unidades", () => {
    const { assunto, texto } = montarMensagem(null, null, dados);
    expect(assunto).toBe("Solicitação de posição de débitos condominiais");
    expect(texto).toContain("Condomínio X\nBloco A, unidade 101\n\nCondomínio Y\nUnidade 1205");
    expect(texto.startsWith("Prezados,")).toBe(true);
    expect(texto).not.toContain("{{");
  });

  it("modelo editado usa as variáveis", () => {
    const { assunto, texto } = montarMensagem("Olá, {{administradora}}.\n{{ unidades }}\nRef. {{competencia}}", "Débitos {{competencia}}", dados);
    expect(assunto).toBe("Débitos Outubro/2026");
    expect(texto).toContain("Olá, Administradora ABC.");
    expect(texto).toContain("Ref. Outubro/2026");
  });

  it("modelo sem {{unidades}} recebe a relação no fim (nunca sai pedido vazio)", () => {
    expect(montarMensagem("Favor informar débitos.", null, dados).texto).toBe("Favor informar débitos.\n\nCondomínio X\nBloco A, unidade 101\n\nCondomínio Y\nUnidade 1205");
  });
});

describe("acompanhamento das solicitações", () => {
  it("aguardando vira 'sem resposta' depois do prazo", () => {
    const s = { status: "enviado", enviado_em: "2026-10-05T12:00:00Z" };
    expect(situacaoSolicitacao(s, "2026-10-08T12:00:00Z", 7)).toBe("aguardando");
    expect(situacaoSolicitacao(s, "2026-10-12T12:00:00Z", 7)).toBe("sem_resposta");
    expect(situacaoSolicitacao({ ...s, status: "respondido" }, "2026-11-30T00:00:00Z", 7)).toBe("respondido");
    expect(situacaoSolicitacao({ ...s, status: "falha" }, "2026-10-05T12:00:01Z", 7)).toBe("falha");
  });
});

function linha(p: Partial<LinhaPainel> & { contratoId: string }): LinhaPainel {
  return {
    imovel: `Imóvel ${p.contratoId}`,
    inquilino: "João Silva",
    condominioNome: null,
    administradoraId: "abc",
    administradoraNome: "ABC Administração",
    metodo: "portal",
    condominio: { id: `vc-${p.contratoId}`, status: "pendente" },
    iptu: { id: `vi-${p.contratoId}`, status: "pendente" },
    ...p,
  };
}

describe("painel", () => {
  const linhas = [
    linha({ contratoId: "1", condominio: { id: "a", status: "sem_debitos" }, iptu: { id: "b", status: "pendente" } }),
    linha({ contratoId: "2", condominio: { id: "c", status: "com_debitos" }, iptu: { id: "d", status: "sem_debitos" }, metodo: "email" }),
    linha({ contratoId: "3", condominio: { id: "e", status: "aguardando_administradora" }, metodo: "email", inquilino: "Maria Souza" }),
    linha({ contratoId: "4", condominio: { id: "f", status: "nao_se_aplica" }, administradoraId: null, administradoraNome: null, metodo: null, iptu: { id: "g", status: "com_debitos" } }),
    linha({ contratoId: "5", condominio: null, iptu: null, imovel: "QI 10 Bloco A 304", condominioNome: "Edifício Águas" }),
  ];

  it("indicadores: 'não se aplica' fica fora de verificados e pendentes", () => {
    expect(resumirPainel(linhas)).toEqual({
      imoveis: 5,
      condominio: { total: 3, verificados: 2, pendentes: 1, comDebito: 1 },
      iptu: { total: 4, verificados: 2, pendentes: 2, comDebito: 1 },
    });
  });

  it("filtros por situação, tipo, administradora, método e busca sem acento", () => {
    const ids = (f: Parameters<typeof filtrarLinhas>[1]) => filtrarLinhas(linhas, f).map((l) => l.contratoId);
    expect(ids({ situacao: "com_debito" })).toEqual(["2", "4"]);
    expect(ids({ situacao: "com_debito", tipo: "condominio" })).toEqual(["2"]);
    expect(ids({ situacao: "pendente", tipo: "iptu_tlp" })).toEqual(["1", "3"]);
    expect(ids({ situacao: "aguardando" })).toEqual(["3"]);
    expect(ids({ situacao: "verificado", tipo: "condominio" })).toEqual(["1", "2"]);
    expect(ids({ metodo: "email" })).toEqual(["2", "3"]);
    expect(ids({ administradoraId: "sem" })).toEqual(["4"]);
    expect(ids({ q: "aguas" })).toEqual(["5"]);
    expect(ids({ q: "MARIA" })).toEqual(["3"]);
  });

  it("ação necessária em uma frase", () => {
    expect(acaoNecessaria(linhas[0])).toEqual({ texto: "Conferir IPTU/TLP", tom: "pendente" });
    expect(acaoNecessaria(linhas[1]).tom).toBe("debito");
    expect(acaoNecessaria(linhas[2]).texto).toBe("Aguardando administradora · conferir IPTU/TLP");
    expect(acaoNecessaria(linha({ contratoId: "9", administradoraId: null })).texto).toContain("Vincular administradora");
    expect(acaoNecessaria(linha({ contratoId: "8", condominio: { id: "x", status: "sem_debitos" }, iptu: { id: "y", status: "sem_debitos" } }))).toEqual({ texto: "Tudo conferido", tom: "ok" });
    expect(acaoNecessaria(linhas[4]).texto).toBe("Sem conferência nesta competência");
  });

  it("ação rápida não sobrescreve débito nem item não aplicável", () => {
    expect(podeMarcarSemDebitoEmLote("pendente")).toBe(true);
    expect(podeMarcarSemDebitoEmLote("aguardando_administradora")).toBe(true);
    expect(podeMarcarSemDebitoEmLote("sem_debitos")).toBe(true);
    expect(podeMarcarSemDebitoEmLote("com_debitos")).toBe(false);
    expect(podeMarcarSemDebitoEmLote("nao_se_aplica")).toBe(false);
  });
});

describe("provedor de tributos (IPTU/TLP)", () => {
  it("hoje é só assistido: leva ao serviço oficial e não consulta sozinho", () => {
    const provedor = obterProvedorTributos(null);
    expect(provedor.automatico).toBe(false);
    expect(provedor.consultar).toBeUndefined();
    expect(provedor.urlConsulta("12345")).toBe(URL_CONSULTA_IPTU_DF);
  });
  it("aceita outro endereço oficial configurado, só https", () => {
    expect(obterProvedorTributos({ url_consulta_iptu: "https://exemplo.df.gov.br/iptu" }).urlConsulta(null)).toBe("https://exemplo.df.gov.br/iptu");
    expect(obterProvedorTributos({ url_consulta_iptu: "javascript:alert(1)" }).urlConsulta(null)).toBe(URL_CONSULTA_IPTU_DF);
  });
  it("inscrição pronta para copiar", () => {
    expect(inscricaoParaCopiar(" 5.219.685-2 ")).toBe("52196852");
  });
});

describe("permissões", () => {
  it("diretora tem tudo; supervisor de locação opera; auxiliar só vê; corretor sem locação não vê", () => {
    expect(permissoesDebitos("diretor", true)).toEqual({ ver: true, operar: true, configurar: true });
    expect(permissoesDebitos("supervisor", true)).toEqual({ ver: true, operar: true, configurar: false });
    expect(permissoesDebitos("gerente_locacao", true)).toEqual({ ver: true, operar: true, configurar: false });
    expect(permissoesDebitos("auxiliar", true)).toEqual({ ver: true, operar: false, configurar: false });
    expect(permissoesDebitos("corretor", false)).toEqual({ ver: false, operar: false, configurar: false });
    expect(permissoesDebitos("supervisor", false).operar).toBe(false);
  });
});

describe("avisos da página inicial", () => {
  it("só mostra o que tem pendência e separa meses anteriores", () => {
    const avisos = montarAvisosDebitos(
      [
        { tipo: "condominio", status: "pendente", competencia: "2026-10-01" },
        { tipo: "condominio", status: "sem_debitos", competencia: "2026-10-01" },
        { tipo: "iptu_tlp", status: "com_debitos", competencia: "2026-10-01" },
        { tipo: "condominio", status: "aguardando_administradora", competencia: "2026-09-01" },
        { tipo: "condominio", status: "com_debitos", competencia: "2026-09-01" },
      ],
      [
        { status: "enviado", enviado_em: "2026-10-01T12:00:00Z", competencia: "2026-10-01", administradora_id: "a" },
        { status: "enviado", enviado_em: "2026-10-02T12:00:00Z", competencia: "2026-10-01", administradora_id: "a" },
        { status: "enviado", enviado_em: "2026-10-01T12:00:00Z", competencia: "2026-10-01", administradora_id: "c" },
        { status: "enviado", enviado_em: "2026-10-19T12:00:00Z", competencia: "2026-10-01", administradora_id: "c" },
        { status: "conferido", enviado_em: "2026-10-01T12:00:00Z", competencia: "2026-10-01", administradora_id: "b" },
      ],
      "2026-10-01",
      "2026-10-20T12:00:00Z",
      7
    );
    expect(avisos.map((a) => a.chave)).toEqual(["cond", "resposta", "debito", "anteriores"]);
    expect(avisos[0].texto).toBe("1 condomínio aguardando conferência");
    expect(avisos[1].texto).toContain("1 administradora sem responder");
    expect(avisos[3].href).toBe("/locacao/debitos?mes=2026-09");
  });
  it("sem pendências não gera aviso", () => {
    expect(montarAvisosDebitos([{ tipo: "condominio", status: "sem_debitos", competencia: "2026-10-01" }], [], "2026-10-01", "2026-10-20T12:00:00Z", 7)).toEqual([]);
  });
});
