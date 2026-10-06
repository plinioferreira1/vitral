import { describe, expect, it } from "vitest";
import {
  acoesPossiveis,
  aguardandoQuem,
  calcularDatas,
  calcularSaldos,
  grupoDoGestor,
  impactoEquipe,
  notificacoesDaAcao,
  papelNaSolicitacao,
  periodoBR,
  periodosAquisitivos,
  podePedirAlteracao,
  situacao,
  somarAnos,
  transicao,
  validarPedido,
} from "./regras";

describe("datas das férias", () => {
  it("15 dias a partir de 05/01: termina em 19/01 e volta no dia útil seguinte", () => {
    expect(calcularDatas("2027-01-05", 15)).toEqual({ fim: "2027-01-19", retorno: "2027-01-20" });
  });
  it("retorno pula o fim de semana", () => {
    // 29/01/2027 é sexta: termina na sexta, volta na segunda
    expect(calcularDatas("2027-01-20", 10)).toEqual({ fim: "2027-01-29", retorno: "2027-02-01" });
    expect(periodoBR("2027-01-05", "2027-01-19")).toBe("05/01 a 19/01/2027");
    expect(periodoBR("2026-12-20", "2027-01-08")).toBe("20/12/2026 a 08/01/2027");
  });
});

describe("períodos aquisitivos e saldo", () => {
  const periodos = periodosAquisitivos("2024-03-10", "2026-10-06");
  it("gera um período por ano de casa e marca os completos", () => {
    expect(periodos.map((p) => [p.inicio, p.fim, p.adquirido])).toEqual([
      ["2024-03-10", "2025-03-09", true],
      ["2025-03-10", "2026-03-09", true],
      ["2026-03-10", "2027-03-09", false],
    ]);
    expect(periodos[0].limite).toBe("2026-03-09");
    expect(periodosAquisitivos(null, "2026-10-06")).toEqual([]);
    expect(somarAnos("2024-02-29", 1)).toBe("2025-02-28");
  });
  it("desconta aprovados, ajustes e pedidos em análise; cancelados e recusados não contam", () => {
    const saldos = calcularSaldos(
      periodos,
      30,
      [
        { id: "a", tipo: "ferias", status: "aprovado", periodo_aquisitivo_inicio: "2025-03-10", dias: 10, abono_dias: 0 },
        { id: "b", tipo: "ferias", status: "aguardando_analise", periodo_aquisitivo_inicio: "2025-03-10", dias: 5, abono_dias: 0 },
        { id: "c", tipo: "ferias", status: "recusado", periodo_aquisitivo_inicio: "2025-03-10", dias: 15, abono_dias: 0 },
        { id: "d", tipo: "cancelamento", status: "aguardando_analise", periodo_aquisitivo_inicio: "2025-03-10", dias: 10, abono_dias: 0 },
      ],
      [{ periodo_inicio: "2024-03-10", dias: 30 }]
    );
    expect(saldos[0].disponivel).toBe(0);
    expect([saldos[1].utilizados, saldos[1].emAnalise, saldos[1].disponivel]).toEqual([10, 5, 15]);
    // ao alterar a própria programação, os dias dela voltam para a conta
    expect(calcularSaldos(periodos, 30, [{ id: "a", tipo: "ferias", status: "aprovado", periodo_aquisitivo_inicio: "2025-03-10", dias: 10, abono_dias: 0 }], [], "a")[1].disponivel).toBe(30);
  });
});

describe("validação do pedido", () => {
  const periodos = periodosAquisitivos("2024-03-10", "2026-10-06");
  const saldos = calcularSaldos(periodos, 30, [], []);
  const ctx = { hoje: "2026-10-06", regime: "clt" as const, saldos, diasPorPeriodo: 30 };
  const base = { periodoInicio: "2025-03-10", dataInicio: "2027-01-05", dias: 15, abonoDias: 0, adiantamento13: false };
  it("pedido válido mostra o saldo restante", () => {
    const r = validarPedido(base, ctx);
    expect(r.erros).toEqual([]);
    expect(r.saldoApos).toBe(15);
  });
  it("bloqueia saldo insuficiente, data passada e período ainda não completo", () => {
    expect(validarPedido({ ...base, dias: 25, abonoDias: 10 }, ctx).erros[0]).toContain("Saldo insuficiente");
    expect(validarPedido({ ...base, dataInicio: "2026-10-06" }, ctx).erros).toContain("A data de início precisa ser futura.");
    expect(validarPedido({ ...base, periodoInicio: "2026-03-10" }, ctx).erros).toContain("Este período aquisitivo ainda não foi completado.");
  });
  it("abono: só CLT e no máximo um terço", () => {
    expect(validarPedido({ ...base, dias: 20, abonoDias: 10 }, ctx).erros).toEqual([]);
    expect(validarPedido({ ...base, dias: 10, abonoDias: 11 }, ctx).erros).toContain("É possível vender no máximo 10 dias.");
    expect(validarPedido({ ...base, abonoDias: 5 }, { ...ctx, regime: "estagio" }).erros[0]).toContain("só está disponível para contrato CLT");
  });
  it("adiantamento do 13º só entre fevereiro e novembro", () => {
    expect(validarPedido({ ...base, adiantamento13: true }, ctx).erros[0]).toContain("adiantamento do 13º");
    expect(validarPedido({ ...base, dataInicio: "2027-03-01", adiantamento13: true }, ctx).erros).toEqual([]);
  });
  it("regras da CLT viram avisos, não bloqueio", () => {
    const r = validarPedido({ ...base, dataInicio: "2026-10-16", dias: 4 }, ctx); // sexta, 10 dias de antecedência
    expect(r.erros).toEqual([]);
    expect(r.avisos.length).toBe(4);
  });
});

describe("negociação", () => {
  const s = { usuario_id: "colab", gestor_id: "gest" };
  it("define o papel de cada pessoa; o dono nunca decide o próprio pedido", () => {
    expect(papelNaSolicitacao(s, "colab", true)).toBe("colaborador");
    expect(papelNaSolicitacao(s, "gest", false)).toBe("gestor");
    expect(papelNaSolicitacao(s, "diretora", true)).toBe("administrador");
    expect(papelNaSolicitacao({ ...s, gestor_id: null }, "diretora", true)).toBe("gestor");
    expect(papelNaSolicitacao(s, "outro", false)).toBeNull();
  });
  it("fluxo do exemplo: solicita, gestor propõe, colaborador contrapropõe, gestor aprova", () => {
    expect(transicao("aguardando_analise", "propor", "gestor")).toEqual({ ok: true, para: "aguardando_colaborador" });
    expect(transicao("aguardando_colaborador", "contrapropor", "colaborador")).toEqual({ ok: true, para: "aguardando_gestor" });
    expect(transicao("aguardando_gestor", "aprovar", "gestor")).toEqual({ ok: true, para: "aprovado" });
  });
  it("colaborador aceita ou recusa a proposta; recusar devolve ao gestor", () => {
    expect(transicao("aguardando_colaborador", "aceitar_proposta", "colaborador")).toEqual({ ok: true, para: "aprovado" });
    expect(transicao("aguardando_colaborador", "recusar_proposta", "colaborador")).toEqual({ ok: true, para: "aguardando_gestor" });
  });
  it("ninguém age fora da sua vez ou do seu papel", () => {
    expect(transicao("aguardando_analise", "aprovar", "colaborador").ok).toBe(false);
    expect(transicao("aguardando_colaborador", "aprovar", "gestor").ok).toBe(false);
    expect(transicao("aguardando_analise", "aceitar_proposta", "colaborador").ok).toBe(false);
    expect(transicao("aprovado", "recusar", "gestor").ok).toBe(false);
    expect(transicao("recusado", "aprovar", "administrador").ok).toBe(false);
    expect(transicao("aguardando_analise", "aprovar", null).ok).toBe(false);
  });
  it("administrador pode intervir mesmo quando a vez é do colaborador", () => {
    expect(transicao("aguardando_colaborador", "aprovar", "administrador")).toEqual({ ok: true, para: "aprovado" });
    expect(acoesPossiveis("aguardando_analise", "gestor")).toEqual(["aprovar", "recusar", "propor"]);
    expect(acoesPossiveis("aguardando_colaborador", "colaborador")).toEqual(["aceitar_proposta", "recusar_proposta", "contrapropor", "cancelar"]);
    expect(acoesPossiveis("aprovado", "colaborador")).toEqual([]);
  });
  it("mostra quem precisa responder e a situação em linguagem simples", () => {
    expect(aguardandoQuem("aguardando_analise")).toBe("gestor");
    expect(aguardandoQuem("aguardando_colaborador")).toBe("colaborador");
    expect(aguardandoQuem("aprovado")).toBeNull();
    const f = { status: "aprovado", tipo: "ferias", data_inicio: "2027-01-05", data_fim: "2027-01-19" };
    expect(situacao(f, "2026-10-06")).toBe("programado");
    expect(situacao(f, "2027-01-10")).toBe("em_ferias");
    expect(situacao(f, "2027-01-20")).toBe("concluido");
    expect(grupoDoGestor("aguardando_gestor")).toBe("pendentes");
    expect(grupoDoGestor("aguardando_colaborador")).toBe("negociacao");
  });
  it("férias aprovadas só mudam por nova solicitação, antes de começar", () => {
    const f = { status: "aprovado", tipo: "ferias", data_inicio: "2027-01-05" };
    expect(podePedirAlteracao(f, "2026-12-01")).toBe(true);
    expect(podePedirAlteracao(f, "2027-01-05")).toBe(false);
    expect(podePedirAlteracao({ ...f, status: "aguardando_analise" }, "2026-12-01")).toBe(false);
  });
});

describe("impacto na equipe e notificações", () => {
  it("conta quem estará de férias, afastado e disponível, sem contar o solicitante", () => {
    const equipe = ["a", "b", "c", "d", "e", "f", "sol"].map((id) => ({ id, nome: id.toUpperCase() }));
    const r = impactoEquipe({ inicio: "2027-01-05", fim: "2027-01-19" }, "sol", equipe, [
      { usuarioId: "a", nome: "A", inicio: "2027-01-10", fim: "2027-01-25", tipo: "ferias" },
      { usuarioId: "b", nome: "B", inicio: "2026-12-01", fim: "2027-01-05", tipo: "afastamento" },
      { usuarioId: "c", nome: "C", inicio: "2027-02-01", fim: "2027-02-10", tipo: "ferias" },
      { usuarioId: "sol", nome: "SOL", inicio: "2027-01-05", fim: "2027-01-19", tipo: "ferias" },
    ]);
    expect([r.emFerias.length, r.afastados.length, r.disponiveis, r.totalEquipe]).toEqual([1, 1, 4, 6]);
  });
  it("cada ação avisa a pessoa certa", () => {
    const d = { colaborador: "Plínio", periodo: "05/01 a 19/01/2027", dias: 15 };
    expect(notificacoesDaAcao("solicitou", d).map((n) => n.para)).toEqual(["colaborador", "gestor"]);
    expect(notificacoesDaAcao("propor", d)[0]).toMatchObject({ para: "colaborador", tipo: "proposta" });
    expect(notificacoesDaAcao("contrapropor", d)[0].para).toBe("gestor");
    expect(notificacoesDaAcao("recusar", { ...d, motivo: "Equipe reduzida" })[0].mensagem).toBe("Motivo: Equipe reduzida");
    expect(notificacoesDaAcao("aprovar", d)[0].para).toBe("colaborador");
  });
});
