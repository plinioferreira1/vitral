import { describe, expect, it } from "vitest";
import { CPS_FICTICIO, LOCACAO_FICTICIA } from "./exemplo";
import { dataTermino, montarCps, montarLocacao, periodoPrimeiroAluguel, validarCps, validarLocacao } from "./montar";

const textoDe = (d: ReturnType<typeof montarLocacao>) =>
  [...d.quadros.flatMap((q) => [q.titulo, ...q.linhas.flat()]), ...d.clausulas.flatMap((c) => [c.titulo, ...c.paragrafos]), ...d.assinaturas.map((a) => `${a.nome} ${a.papel}`)].join("\n");

describe("contrato de locação", () => {
  it("calcula término e período do 1º aluguel", () => {
    expect(dataTermino("2026-11-10", 30)).toBe("2029-05-09");
    expect(dataTermino("2026-01-31", 1)).toBe("2026-02-27");
    expect(periodoPrimeiroAluguel("2026-11-10", "2026-12-10")).toEqual({ inicio: "2026-11-10", fim: "2026-12-09" });
    expect(periodoPrimeiroAluguel("2026-11-10", "2026-11-01")).toBeNull();
  });
  it("monta 22 cláusulas com a garantia certa e o quadro preenchido", () => {
    const d = montarLocacao(LOCACAO_FICTICIA);
    expect(d.clausulas).toHaveLength(22);
    expect(d.clausulas[13].titulo).toMatch(/DÉCIMA QUARTA/);
    const t = textoDe(d);
    expect(t).toMatch(/R\$ 2\.500,00 \(dois mil e quinhentos reais\)/);
    expect(t).toMatch(/30 \(trinta\) meses/);
    expect(t).toMatch(/9 de maio de 2029/);
    expect(t).toMatch(/CÔNJUGE DO FIADOR/);
    expect(t).toMatch(/Cônjuge do Fiador/);
    expect(t).not.toMatch(/\{\{|XXXX/);
  });
  it("troca a cláusula 14 por garantia e preenche o título de capitalização", () => {
    const sf = montarLocacao({ ...LOCACAO_FICTICIA, garantia: "seguro_fianca" });
    expect(textoDe(sf)).toMatch(/LOFT/);
    expect(sf.quadros.some((q) => q.titulo.startsWith("FIADOR"))).toBe(false);
    const tc = montarLocacao({ ...LOCACAO_FICTICIA, garantia: "titulo_capitalizacao", tituloValorCentavos: 750000, tituloProposta: "123456" });
    const c14 = tc.clausulas[13].paragrafos.join(" ");
    expect(c14).toMatch(/BRASILCAP/);
    expect(c14).toMatch(/R\$ 7\.500,00 \(sete mil e quinhentos reais\)/);
    expect(c14).toMatch(/nº 123456/);
    expect(montarLocacao({ ...LOCACAO_FICTICIA, garantia: "garantia_investe" }).assinaturas[0].papel).toBe("Administradora");
  });
  it("dois fiadores numerados; sem desconto mostra 'Não há'", () => {
    const d = montarLocacao({ ...LOCACAO_FICTICIA, fiadores: [LOCACAO_FICTICIA.fiadores[0], { ...LOCACAO_FICTICIA.fiadores[0], conjuge: null, nome: "Outro Fiador" }], descontoCentavos: 0 });
    expect(d.quadros.map((q) => q.titulo)).toContain("FIADOR 2");
    expect(textoDe(d)).toMatch(/Desconto de pontualidade:\nNão há/);
  });
  it("valida o essencial", () => {
    expect(validarLocacao(LOCACAO_FICTICIA)).toEqual([]);
    expect(validarLocacao({ ...LOCACAO_FICTICIA, garantia: "titulo_capitalizacao" }).join(" ")).toMatch(/valor nominal.*proposta/);
    expect(validarLocacao({ ...LOCACAO_FICTICIA, fiadores: [] }).join(" ")).toMatch(/um ou dois fiadores/);
    expect(validarLocacao({ ...LOCACAO_FICTICIA, aluguelCentavos: 0 }).join(" ")).toMatch(/aluguel/);
  });
});

describe("contrato de prestação de serviços", () => {
  it("marca a modalidade, imprime beneficiários e anexa a procuração", () => {
    const d = montarCps(CPS_FICTICIO);
    const modalidade = d.quadros.find((q) => q.titulo === "CONDIÇÕES COMERCIAIS")!.linhas[1][1];
    expect(modalidade).toMatch(/\[X\] Garantida/);
    expect(modalidade).toMatch(/\[ {2}\] Tradicional/);
    expect(d.clausulas).toHaveLength(17);
    expect(d.anexo?.titulo).toMatch(/PROCURAÇÃO/);
    expect(validarCps(CPS_FICTICIO)).toEqual([]);
    const dois = { ...CPS_FICTICIO, beneficiarios: [CPS_FICTICIO.beneficiarios[0], { ...CPS_FICTICIO.beneficiarios[0], percentual: "40%" }].map((b, i) => (i === 0 ? { ...b, percentual: "50%" } : b)) };
    expect(validarCps(dois).join(" ")).toMatch(/somar 100%/);
  });
});

describe("leitura dos dados enviados pela tela", () => {
  it("limita tamanhos, descarta garantia desconhecida e aceita no máximo 2 fiadores/beneficiários", async () => {
    const { lerLocacao, lerCps } = await import("./entrada");
    const l = lerLocacao({ ...LOCACAO_FICTICIA, garantia: "outra", fiadores: [1, 2, 3].map(() => LOCACAO_FICTICIA.fiadores[0]), locatario: { nome: "x".repeat(500) } });
    expect(l.garantia).toBe("fiador");
    expect(l.fiadores).toHaveLength(2);
    expect(l.locatario.nome).toHaveLength(200);
    expect(l.inicio).toBe("2026-11-10");
    expect(lerLocacao({ inicio: "10/11/2026" }).inicio).toBe("");
    const c = lerCps({ ...CPS_FICTICIO, modalidade: "?", beneficiarios: [1, 2, 3].map(() => CPS_FICTICIO.beneficiarios[0]) });
    expect(c.modalidade).toBe("");
    expect(c.beneficiarios).toHaveLength(2);
    expect(validarCps(c).join(" ")).toMatch(/modalidade/);
  });
});
