import { describe, expect, it } from "vitest";
import { calcularAcerto, calcularEncargo, diasNoPeriodo, fraseAcerto, periodoDoAno, periodoDoMes, proporcao, type EncargoEntrada } from "./calculo";
import {
  MODELO_PADRAO,
  calcularDocumento,
  descreverAlteracoes,
  documentoVazio,
  montarRetrato,
  normalizarDocumento,
  pendenciasParaGerar,
  permissoesTermo,
  podeCriarNovaVersao,
  podeEditarConteudo,
  podeVoltarParaEdicao,
  renderizarClausula,
  statusPorAssinaturas,
  textoRessarcimento,
  textoResumo,
  type DocumentoTermo,
} from "./conteudo";
import { formatarCentavos, inteiroPorExtenso, textoParaCentavos, valorPorExtenso } from "./extenso";

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

function encargo(p: Partial<EncargoEntrada>): EncargoEntrada {
  return {
    id: uuid(),
    categoria: "condominio",
    descricao: "Condomínio",
    competencia: "",
    periodoInicio: null,
    periodoFim: null,
    vencimento: null,
    valorTotalCentavos: 0,
    pagoPor: "vendedor",
    responsavel: "proporcional",
    tipoCalculo: "proporcional_dias",
    manualVendedorCentavos: 0,
    manualCompradorCentavos: 0,
    observacao: "",
    ...p,
  };
}
const mensal = (ano: number, mes: number, valor: number, extra: Partial<EncargoEntrada> = {}) => {
  const p = periodoDoMes(ano, mes);
  return encargo({ periodoInicio: p.inicio, periodoFim: p.fim, valorTotalCentavos: valor, ...extra });
};

describe("cenário do documento atual da Sacra", () => {
  const condominio = mensal(2026, 10, 33880);
  const iptu = encargo({ categoria: "iptu_tlp", descricao: "IPTU/TLP 2026", ...{ periodoInicio: "2026-01-01", periodoFim: "2026-12-31" }, valorTotalCentavos: 62327 });
  const c1 = calcularEncargo(condominio, "2026-10-02");
  const c2 = calcularEncargo(iptu, "2026-10-02");

  it("condomínio de outubro: 30 dias do comprador = R$ 327,87", () => {
    expect(c1.diasTotal).toBe(31);
    expect(c1.diasVendedor).toBe(1);
    expect(c1.diasComprador).toBe(30);
    expect(c1.periodoComprador).toEqual({ inicio: "2026-10-02", fim: "2026-10-31" });
    expect(c1.parteCompradorCentavos).toBe(32787);
    expect(c1.parteVendedorCentavos).toBe(1093);
    expect(c1.ressarcimentoDe).toBe("comprador");
  });
  it("IPTU/TLP 2026: 91 dias do comprador = R$ 155,39", () => {
    expect(c2.diasTotal).toBe(365);
    expect(c2.diasComprador).toBe(91);
    expect(c2.periodoComprador).toEqual({ inicio: "2026-10-02", fim: "2026-12-31" });
    expect(c2.parteCompradorCentavos).toBe(15539);
  });
  it("saldo: comprador ressarce R$ 483,26, com número e extenso iguais", () => {
    const acerto = calcularAcerto([c1, c2]);
    expect(acerto.saldoCentavos).toBe(48326);
    expect(acerto.devedor).toBe("comprador");
    expect(acerto.aFavorDe).toBe("vendedor");
    expect(fraseAcerto(acerto)).toBe("COMPRADOR DEVE AO VENDEDOR R$ 483,26.");
    expect(valorPorExtenso(15539)).toBe("cento e cinquenta e cinco reais e trinta e nove centavos");
    expect(valorPorExtenso(48326)).toBe("quatrocentos e oitenta e três reais e vinte e seis centavos");
  });
});

describe("proporcional por dias", () => {
  it("fevereiro de 28 dias", () => {
    const c = calcularEncargo(mensal(2026, 2, 28000), "2026-02-15");
    expect([c.diasTotal, c.diasVendedor, c.diasComprador]).toEqual([28, 14, 14]);
    expect(c.parteCompradorCentavos).toBe(14000);
  });
  it("fevereiro bissexto (29 dias)", () => {
    const c = calcularEncargo(mensal(2028, 2, 29000), "2028-02-29");
    expect([c.diasTotal, c.diasVendedor, c.diasComprador]).toEqual([29, 28, 1]);
    expect(c.parteCompradorCentavos).toBe(1000);
  });
  it("mês de 30 dias", () => {
    const c = calcularEncargo(mensal(2026, 9, 38000), "2026-09-17");
    expect([c.diasTotal, c.diasComprador]).toEqual([30, 14]);
    expect(c.parteCompradorCentavos).toBe(17733);
    expect(c.parteVendedorCentavos + c.parteCompradorCentavos).toBe(38000);
  });
  it("mês de 31 dias", () => {
    const c = calcularEncargo(mensal(2026, 7, 31000), "2026-07-11");
    expect([c.diasTotal, c.diasVendedor, c.diasComprador]).toEqual([31, 10, 21]);
    expect(c.parteCompradorCentavos).toBe(21000);
  });
  it("ano comum tem 365 dias e bissexto 366", () => {
    const comum = periodoDoAno(2026);
    const bissexto = periodoDoAno(2028);
    expect(diasNoPeriodo(comum.inicio, comum.fim)).toBe(365);
    expect(diasNoPeriodo(bissexto.inicio, bissexto.fim)).toBe(366);
    const c = calcularEncargo(encargo({ periodoInicio: bissexto.inicio, periodoFim: bissexto.fim, valorTotalCentavos: 36600 }), "2028-03-01");
    expect([c.diasTotal, c.diasVendedor, c.diasComprador]).toEqual([366, 60, 306]);
    expect(c.parteCompradorCentavos).toBe(30600);
  });
  it("período que cruza o mês", () => {
    const c = calcularEncargo(encargo({ periodoInicio: "2026-09-15", periodoFim: "2026-10-14", valorTotalCentavos: 30000 }), "2026-10-01");
    expect([c.diasTotal, c.diasVendedor, c.diasComprador]).toEqual([30, 16, 14]);
    expect(c.parteCompradorCentavos).toBe(14000);
  });
  it("período que cruza o ano", () => {
    const c = calcularEncargo(encargo({ periodoInicio: "2026-12-16", periodoFim: "2027-01-15", valorTotalCentavos: 31000 }), "2027-01-01");
    expect([c.diasTotal, c.diasVendedor, c.diasComprador]).toEqual([31, 16, 15]);
    expect(c.periodoVendedor).toEqual({ inicio: "2026-12-16", fim: "2026-12-31" });
    expect(c.periodoComprador).toEqual({ inicio: "2027-01-01", fim: "2027-01-15" });
    expect(c.parteCompradorCentavos).toBe(15000);
  });
  it("entrega no primeiro dia do mês: tudo do comprador", () => {
    const c = calcularEncargo(mensal(2026, 10, 33880), "2026-10-01");
    expect([c.diasVendedor, c.diasComprador]).toEqual([0, 31]);
    expect(c.parteCompradorCentavos).toBe(33880);
    expect(c.parteVendedorCentavos).toBe(0);
  });
  it("entrega no último dia do mês: comprador responde por 1 dia", () => {
    const c = calcularEncargo(mensal(2026, 10, 31000), "2026-10-31");
    expect([c.diasVendedor, c.diasComprador]).toEqual([30, 1]);
    expect(c.parteCompradorCentavos).toBe(1000);
  });
  it("marco fora do período", () => {
    expect(calcularEncargo(mensal(2026, 10, 10000), "2026-11-05").parteVendedorCentavos).toBe(10000);
    expect(calcularEncargo(mensal(2026, 10, 10000), "2026-09-05").parteCompradorCentavos).toBe(10000);
  });
  it("arredonda meio centavo para cima e as partes sempre somam o total", () => {
    expect(proporcao(100, 1, 3)).toBe(33);
    expect(proporcao(100, 2, 3)).toBe(67);
    expect(proporcao(1, 1, 2)).toBe(1);
    expect(proporcao(10, 1, 4)).toBe(3); // 2,5 -> 3
    for (const valor of [1, 99, 33880, 62327, 123457]) {
      const c = calcularEncargo(mensal(2026, 10, valor), "2026-10-13");
      expect(c.parteVendedorCentavos + c.parteCompradorCentavos).toBe(valor);
    }
  });
  it("sem período ou sem marco, o item fica inválido e não entra no acerto", () => {
    const c = calcularEncargo(encargo({ valorTotalCentavos: 1000 }), "2026-10-02");
    expect(c.valido).toBe(false);
    expect(calcularAcerto([c]).saldoCentavos).toBe(0);
    expect(calcularEncargo(mensal(2026, 10, 1000), null).valido).toBe(false);
    expect(calcularEncargo(encargo({ periodoInicio: "2026-10-31", periodoFim: "2026-10-01", valorTotalCentavos: 1 }), "2026-10-02").valido).toBe(false);
  });
});

describe("quem pagou x quem deve", () => {
  it("vendedor pagou: comprador ressarce a parte dele", () => {
    const c = calcularEncargo(mensal(2026, 10, 33880, { pagoPor: "vendedor" }), "2026-10-02");
    expect([c.ressarcimentoDe, c.ressarcimentoPara, c.ressarcimentoCentavos]).toEqual(["comprador", "vendedor", 32787]);
  });
  it("comprador pagou R$ 120 e R$ 80 são do vendedor: vendedor ressarce R$ 80", () => {
    const c = calcularEncargo(encargo({ categoria: "energia", valorTotalCentavos: 12000, pagoPor: "comprador", tipoCalculo: "manual", responsavel: "proporcional", manualVendedorCentavos: 8000, manualCompradorCentavos: 4000 }), "2026-10-02");
    expect([c.ressarcimentoDe, c.ressarcimentoPara, c.ressarcimentoCentavos]).toEqual(["vendedor", "comprador", 8000]);
  });
  it("valor integral: do vendedor, do comprador ou meio a meio", () => {
    const base = { tipoCalculo: "integral" as const, valorTotalCentavos: 10001 };
    const multaVendedor = calcularEncargo(encargo({ ...base, responsavel: "vendedor", pagoPor: "comprador" }), null);
    expect([multaVendedor.parteVendedorCentavos, multaVendedor.ressarcimentoDe, multaVendedor.ressarcimentoCentavos]).toEqual([10001, "vendedor", 10001]);
    const multaComprador = calcularEncargo(encargo({ ...base, responsavel: "comprador", pagoPor: "vendedor" }), null);
    expect([multaComprador.parteCompradorCentavos, multaComprador.ressarcimentoDe]).toEqual([10001, "comprador"]);
    const meio = calcularEncargo(encargo({ ...base, responsavel: "ambos", pagoPor: "vendedor" }), null);
    expect([meio.parteVendedorCentavos, meio.parteCompradorCentavos]).toEqual([5001, 5000]);
    // quem pagou é o próprio responsável: nada a ressarcir
    expect(calcularEncargo(encargo({ ...base, responsavel: "vendedor", pagoPor: "vendedor" }), null).ressarcimentoCentavos).toBe(0);
  });
  it("valor manual avisa quando as partes não somam o total", () => {
    const c = calcularEncargo(encargo({ tipoCalculo: "manual", valorTotalCentavos: 10000, manualVendedorCentavos: 3000, manualCompradorCentavos: 2000 }), null);
    expect(c.valido).toBe(true);
    expect(c.avisos.length).toBe(1);
    expect(c.ressarcimentoCentavos).toBe(2000);
  });
  it("item não pago não gera ressarcimento: cada parte quita a sua", () => {
    const c = calcularEncargo(mensal(2026, 10, 31000, { pagoPor: "nao_pago" }), "2026-10-11");
    expect(c.ressarcimentoCentavos).toBe(0);
    expect([c.emAbertoVendedorCentavos, c.emAbertoCompradorCentavos]).toEqual([10000, 21000]);
  });
});

describe("compensação automática", () => {
  const compradorDeve = calcularEncargo(encargo({ tipoCalculo: "integral", responsavel: "comprador", pagoPor: "vendedor", valorTotalCentavos: 48326 }), null);
  const vendedorDeve = calcularEncargo(encargo({ tipoCalculo: "integral", responsavel: "vendedor", pagoPor: "comprador", valorTotalCentavos: 8000 }), null);
  it("comprador deve 483,26 e vendedor deve 80,00: saldo de 403,26 a favor do vendedor", () => {
    const a = calcularAcerto([compradorDeve, vendedorDeve]);
    expect([a.compradorDeveCentavos, a.vendedorDeveCentavos, a.saldoCentavos, a.aFavorDe]).toEqual([48326, 8000, 40326, "vendedor"]);
    expect(fraseAcerto(a)).toBe("COMPRADOR DEVE AO VENDEDOR R$ 403,26.");
  });
  it("vendedor devendo ao comprador", () => {
    const a = calcularAcerto([vendedorDeve]);
    expect([a.devedor, a.aFavorDe, a.saldoCentavos]).toEqual(["vendedor", "comprador", 8000]);
    expect(fraseAcerto(a)).toBe("VENDEDOR DEVE AO COMPRADOR R$ 80,00.");
  });
  it("saldo zero", () => {
    const igual = calcularEncargo(encargo({ tipoCalculo: "integral", responsavel: "vendedor", pagoPor: "comprador", valorTotalCentavos: 48326 }), null);
    const a = calcularAcerto([compradorDeve, igual]);
    expect([a.saldoCentavos, a.devedor, a.aFavorDe]).toEqual([0, null, null]);
    expect(fraseAcerto(a)).toBe("NÃO HÁ VALORES A RESSARCIR.");
    expect(fraseAcerto(calcularAcerto([]))).toBe("NÃO HÁ VALORES A RESSARCIR.");
  });
  it("múltiplos vendedores e compradores entram no plural", () => {
    const a = calcularAcerto([compradorDeve]);
    expect(fraseAcerto(a, { vendedores: 2, compradores: 1 })).toBe("COMPRADOR DEVE AOS VENDEDORES R$ 483,26.");
    expect(fraseAcerto(a, { vendedores: 1, compradores: 2 })).toBe("COMPRADORES DEVEM AO VENDEDOR R$ 483,26.");
  });
});

describe("valor por extenso e dinheiro sem ponto flutuante", () => {
  it("escreve valores comuns", () => {
    expect(valorPorExtenso(32787)).toBe("trezentos e vinte e sete reais e oitenta e sete centavos");
    expect(valorPorExtenso(10000)).toBe("cem reais");
    expect(valorPorExtenso(100)).toBe("um real");
    expect(valorPorExtenso(1)).toBe("um centavo");
    expect(valorPorExtenso(101)).toBe("um real e um centavo");
    expect(valorPorExtenso(100000)).toBe("mil reais");
    expect(valorPorExtenso(100100)).toBe("mil e um reais");
    expect(valorPorExtenso(123456)).toBe("mil duzentos e trinta e quatro reais e cinquenta e seis centavos");
    expect(valorPorExtenso(150000)).toBe("mil e quinhentos reais");
    expect(valorPorExtenso(210050)).toBe("dois mil e cem reais e cinquenta centavos");
    expect(valorPorExtenso(100000000)).toBe("um milhão de reais");
    expect(valorPorExtenso(250000000)).toBe("dois milhões e quinhentos mil reais");
    expect(inteiroPorExtenso(10)).toBe("dez");
    expect(inteiroPorExtenso(21)).toBe("vinte e um");
  });
  it("lê o que foi digitado em centavos exatos", () => {
    expect(textoParaCentavos("338,80")).toBe(33880);
    expect(textoParaCentavos("R$ 1.234,56")).toBe(123456);
    expect(textoParaCentavos("623.27")).toBe(62327);
    expect(textoParaCentavos("0,1")).toBe(10);
    expect(textoParaCentavos("0,29")).toBe(29); // 0.29*100 em float daria 28,999…
    expect(textoParaCentavos("1.000")).toBe(100000);
    expect(textoParaCentavos("")).toBe(0);
    expect(formatarCentavos(48326)).toBe("R$ 483,26");
    expect(formatarCentavos(123456789)).toBe("R$ 1.234.567,89");
  });
});

function documentoExemplo(): DocumentoTermo {
  const doc = documentoVazio();
  const v1 = uuid();
  doc.partes = [
    { id: v1, papel: "vendedor", nome: "Vendedor Um (fictício)", cpfCnpj: "000.000.000-00", rg: "", email: "", clienteId: null },
    { id: uuid(), papel: "vendedor", nome: "Vendedora Dois (fictícia)", cpfCnpj: "", rg: "", email: "", clienteId: null },
    { id: uuid(), papel: "comprador", nome: "Compradora (fictícia)", cpfCnpj: "", rg: "", email: "", clienteId: null },
  ];
  doc.imovel.endereco = "Apartamento fictício 303";
  doc.dataEntrega = "2026-10-02";
  doc.encargos = [mensal(2026, 10, 33880), encargo({ categoria: "iptu_tlp", descricao: "IPTU/TLP 2026", periodoInicio: "2026-01-01", periodoFim: "2026-12-31", valorTotalCentavos: 62327 })];
  doc.ressarcimento = { beneficiario: v1, nome: "", cpfCnpj: "", banco: "Caixa Econômica Federal", agencia: "0000", conta: "000000-0", tipoConta: "", chavePix: "teste@exemplo.com", tipoChavePix: "email" };
  return doc;
}

describe("documento, textos, versão e bloqueio", () => {
  it("calcula o documento inteiro e monta os textos sem divergência", () => {
    const doc = documentoExemplo();
    const { acerto } = calcularDocumento(doc);
    expect(acerto.saldoCentavos).toBe(48326);
    expect(textoResumo(doc, acerto)).toBe(
      "Fica sob responsabilidade do COMPRADOR ressarcir aos VENDEDORES o montante de R$ 483,26 (quatrocentos e oitenta e três reais e vinte e seis centavos)."
    );
    expect(textoRessarcimento(doc, acerto)).toBe(
      "O reembolso de valores deverá ser transferido em nome de VENDEDOR UM (FICTÍCIO), portador(a) do CPF N° 000.000.000-00, através de TED ou PIX para o Banco Caixa Econômica Federal, Agência N° 0000, Conta N° 000000-0, Chave PIX – E-MAIL: teste@exemplo.com."
    );
    expect(renderizarClausula(doc)).toContain("no prazo de até 10 (dez) dias úteis");
    expect(renderizarClausula(doc)).toContain("multa diária de R$ 100,00 (cem reais)");
    expect(pendenciasParaGerar(doc)).toEqual([]);
  });
  it("marco diferente da entrega muda o cálculo", () => {
    const doc = documentoExemplo();
    doc.marco = "escritura";
    doc.marcoData = "2026-10-11";
    expect(calcularDocumento(doc).calculos[doc.encargos[0].id].diasComprador).toBe(21);
    doc.marcoData = null;
    expect(pendenciasParaGerar(doc)).toContain("Informe a data do marco da proporcionalidade.");
  });
  it("aponta o que falta antes de gerar", () => {
    const p = pendenciasParaGerar(documentoVazio());
    expect(p).toContain("Informe ao menos um vendedor.");
    expect(p).toContain("Informe a data da entrega das chaves.");
    const doc = documentoExemplo();
    doc.ressarcimento.beneficiario = "";
    expect(pendenciasParaGerar(doc)).toContain("Há saldo a ressarcir: informe o beneficiário e os dados bancários.");
  });
  it("limpa o que vem da tela: ids repetidos, listas inválidas e valores absurdos", () => {
    const doc = documentoExemplo();
    const sujo = JSON.parse(JSON.stringify(doc));
    sujo.encargos.push({ ...sujo.encargos[0] }); // id repetido
    sujo.encargos[0].valorTotalCentavos = -5;
    sujo.encargos[1].pagoPor = "hacker";
    sujo.encargos[1].tipoCalculo = "integral";
    sujo.encargos[1].responsavel = "proporcional";
    sujo.partes.push({ id: "x", papel: "comprador", nome: "sem id válido" });
    sujo.marco = "qualquer";
    const limpo = normalizarDocumento(sujo);
    expect(limpo.encargos.length).toBe(2);
    expect(limpo.encargos[0].valorTotalCentavos).toBe(0);
    expect(limpo.encargos[1].pagoPor).toBe("vendedor");
    expect(limpo.encargos[1].responsavel).toBe("vendedor");
    expect(limpo.partes.length).toBe(3);
    expect(limpo.marco).toBe("entrega");
    expect(normalizarDocumento(null).clausula.texto).toBe(MODELO_PADRAO.clausulaPadrao);
  });
  it("o retrato da versão não muda quando o cadastro é alterado depois", () => {
    const doc = documentoExemplo();
    const retrato = montarRetrato(JSON.parse(JSON.stringify(doc)), { codigo: "TEC-2026-0001", versao: 1, geradoEm: "2026-10-02T12:00:00Z", geradoPorNome: "Teste", modelo: MODELO_PADRAO });
    const congelado = JSON.stringify(retrato);
    doc.partes[0].nome = "Outro nome";
    doc.encargos[1].valorTotalCentavos = 99999;
    doc.imovel.matricula = "nova";
    expect(JSON.stringify(retrato)).toBe(congelado);
    expect(retrato.acerto.saldoCentavos).toBe(48326);
    expect(retrato.regra).toBe("proporcional-dias-v1");
    expect(retrato.textos.resultado).toBe("COMPRADOR DEVE AOS VENDEDORES R$ 483,26.");
  });
  it("criação de versão: só depois de alguma assinatura; antes disso volta-se a editar a mesma", () => {
    expect(podeCriarNovaVersao("assinado")).toBe(true);
    expect(podeCriarNovaVersao("parcialmente_assinado")).toBe(true);
    expect(podeCriarNovaVersao("rascunho")).toBe(false);
    expect(podeVoltarParaEdicao("gerado")).toBe(true);
    expect(podeVoltarParaEdicao("aguardando_assinatura")).toBe(true);
    expect(podeVoltarParaEdicao("assinado")).toBe(false);
    expect(podeVoltarParaEdicao("parcialmente_assinado")).toBe(false);
  });
  it("bloqueio após assinatura: conteúdo só é editável em rascunho", () => {
    expect(podeEditarConteudo("rascunho")).toBe(true);
    for (const s of ["gerado", "aguardando_assinatura", "parcialmente_assinado", "assinado", "cancelado"] as const) expect(podeEditarConteudo(s)).toBe(false);
    expect(statusPorAssinaturas(3, 0)).toBe("aguardando_assinatura");
    expect(statusPorAssinaturas(3, 1)).toBe("parcialmente_assinado");
    expect(statusPorAssinaturas(3, 3)).toBe("assinado");
  });
  it("auditoria descreve valores, datas e responsáveis alterados", () => {
    const antes = documentoExemplo();
    const depois: DocumentoTermo = JSON.parse(JSON.stringify(antes));
    depois.encargos[0].valorTotalCentavos = 40000;
    depois.encargos[0].pagoPor = "comprador";
    depois.encargos.pop();
    depois.encargos.push(encargo({ descricao: "Multa", tipoCalculo: "integral", responsavel: "vendedor", valorTotalCentavos: 5000 }));
    depois.dataEntrega = "2026-10-05";
    const acoes = descreverAlteracoes(antes, depois).map((a) => a.acao);
    expect(acoes).toEqual(["encargo_alterado", "encargo_adicionado", "encargo_removido", "data_alterada"]);
    const texto = descreverAlteracoes(antes, depois)[0].descricao;
    expect(texto).toContain("valor de R$ 338,80 para R$ 400,00");
    expect(texto).toContain("quem pagou de Vendedor para Comprador");
    expect(descreverAlteracoes(antes, antes)).toEqual([]);
  });
  it("permissões seguem nível + área de Vendas", () => {
    expect(permissoesTermo("diretor", true)).toEqual({ ver: true, operar: true, configurar: true });
    expect(permissoesTermo("supervisor", true)).toEqual({ ver: true, operar: true, configurar: false });
    expect(permissoesTermo("auxiliar", true)).toEqual({ ver: true, operar: false, configurar: false });
    expect(permissoesTermo("supervisor", false)).toEqual({ ver: false, operar: false, configurar: false });
    expect(permissoesTermo("corretor", true).ver).toBe(false);
  });
});
