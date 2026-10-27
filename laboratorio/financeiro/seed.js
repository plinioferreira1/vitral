// Dados fictícios do laboratório, gerados em relação à data de hoje.
// Nenhum nome, valor ou conta aqui corresponde a dados reais da Sacra.
import { somarDias, somarMeses, mesDe, saldoConta } from "./core.js";

const R = (reais) => Math.round(reais * 100);

export const CATEGORIAS = [
  { id: "c-com-venda", nome: "Comissão de venda", tipo: "receita", grupo: "Receitas de intermediação" },
  { id: "c-com-captacao", nome: "Comissão de captação", tipo: "receita", grupo: "Receitas de intermediação" },
  { id: "c-avaliacao", nome: "Avaliação de imóveis", tipo: "receita", grupo: "Serviços" },
  { id: "c-correspondente", nome: "Remuneração de correspondente", tipo: "receita", grupo: "Receitas Sacra Cred" },
  { id: "c-assessoria", nome: "Assessoria de financiamento", tipo: "receita", grupo: "Receitas Sacra Cred" },
  { id: "c-repasse", nome: "Repasse a corretores", tipo: "despesa", grupo: "Custo das vendas" },
  { id: "c-portais", nome: "Portais imobiliários", tipo: "despesa", grupo: "Marketing" },
  { id: "c-anuncios", nome: "Anúncios on-line", tipo: "despesa", grupo: "Marketing" },
  { id: "c-aluguel", nome: "Aluguel da sede", tipo: "despesa", grupo: "Estrutura" },
  { id: "c-energia", nome: "Energia e internet", tipo: "despesa", grupo: "Estrutura" },
  { id: "c-software", nome: "Software e sistemas", tipo: "despesa", grupo: "Estrutura" },
  { id: "c-folha", nome: "Salários e encargos", tipo: "despesa", grupo: "Pessoas" },
  { id: "c-contabil", nome: "Contabilidade", tipo: "despesa", grupo: "Serviços de terceiros" },
  { id: "c-transporte", nome: "Transporte e deslocamento", tipo: "despesa", grupo: "Operação" },
  { id: "c-alimentacao", nome: "Alimentação", tipo: "despesa", grupo: "Operação" },
  { id: "c-cartorio", nome: "Cartório e certidões", tipo: "despesa", grupo: "Operação" },
  { id: "c-tarifas", nome: "Tarifas bancárias", tipo: "despesa", grupo: "Financeiras" },
];

export const CONTAS = [
  { id: "k-net-1", nome: "Banco Aurora · CC 1020", banco: "Banco Aurora", empresa: "net", saldoInicial: R(48200) },
  { id: "k-net-2", nome: "Banco Horizonte · CC 7734", banco: "Banco Horizonte", empresa: "net", saldoInicial: R(15350) },
  { id: "k-cred-1", nome: "Banco Aurora · CC 5581", banco: "Banco Aurora", empresa: "cred", saldoInicial: R(22900) },
];

export const CARTOES = [
  { id: "cc-1", nome: "Cartão Empresarial final 4410", final: "4410", banco: "Banco Aurora", empresa: "net", contaPagamento: "k-net-1" },
];

export function gerarDemo(hoje) {
  const d = (delta) => somarDias(hoje, delta);
  const mes = mesDe(hoje);
  const inicioMes = `${mes}-01`;
  let n = 0;
  const id = () => `t-demo-${++n}`;
  const t = (o) => ({ id: id(), contato: "", categoria: "", conta: "", status: "ativo", natureza: "normal", origem: null, serie: null, criadoEm: `${d(-40)}T12:00:00.000Z`, ...o, competencia: o.competencia ?? mesDe(o.vencimento) });

  const titulos = [
    // Receitas Netimóveis — comissões ligadas a processos (fictícios)
    t({ tipo: "receita", descricao: "Comissão · venda Residencial Ipê", contato: "Cliente comprador A", empresa: "net", categoria: "c-com-venda", valor: R(18400), vencimento: d(3), conta: "k-net-1", origem: { tipo: "comissao", ref: "V-0142" } }),
    t({ tipo: "receita", descricao: "Comissão · venda Edifício Jatobá", contato: "Cliente vendedor B", empresa: "net", categoria: "c-com-venda", valor: R(26750), vencimento: d(-2), conta: "k-net-1", origem: { tipo: "comissao", ref: "V-0139" } }),
    t({ tipo: "receita", descricao: "Comissão · venda Condomínio Aroeira", contato: "Cliente comprador C", empresa: "net", categoria: "c-com-venda", valor: R(12000), vencimento: d(19), conta: "k-net-2", origem: { tipo: "comissao", ref: "V-0145" } }),
    t({ tipo: "receita", descricao: "Captação · Casa Lago Norte", contato: "Proprietário D", empresa: "net", categoria: "c-com-captacao", valor: R(3200), vencimento: d(-12), conta: "k-net-1" }),
    t({ tipo: "receita", descricao: "Estudo comercial de preço", contato: "Cliente E", empresa: "net", categoria: "c-avaliacao", valor: R(950), vencimento: d(-20), conta: "k-net-2" }),
    t({ tipo: "receita", descricao: "Comissão · venda Setor Sudoeste", contato: "Cliente comprador F", empresa: "net", categoria: "c-com-venda", valor: R(31500), vencimento: d(46), conta: "k-net-1", origem: { tipo: "comissao", ref: "V-0148" } }),
    // Receitas Sacra Cred — remuneração de correspondente (fictícia)
    t({ tipo: "receita", descricao: "Correspondente · contrato liberado", contato: "Banco parceiro Alfa", empresa: "cred", categoria: "c-correspondente", valor: R(4300), vencimento: d(1), conta: "k-cred-1", origem: { tipo: "correspondente", ref: "F-0071" } }),
    t({ tipo: "receita", descricao: "Correspondente · contrato liberado", contato: "Banco parceiro Beta", empresa: "cred", categoria: "c-correspondente", valor: R(5120), vencimento: d(-15), conta: "k-cred-1", origem: { tipo: "correspondente", ref: "F-0066" } }),
    t({ tipo: "receita", descricao: "Assessoria de financiamento", contato: "Cliente G", empresa: "cred", categoria: "c-assessoria", valor: R(1800), vencimento: d(9), conta: "k-cred-1" }),
    t({ tipo: "receita", descricao: "Correspondente · contrato em análise", contato: "Banco parceiro Alfa", empresa: "cred", categoria: "c-correspondente", valor: R(3950), vencimento: d(33), conta: "k-cred-1", origem: { tipo: "correspondente", ref: "F-0074" } }),
    // Despesas Netimóveis
    t({ tipo: "despesa", descricao: "Repasse corretor · Residencial Ipê", contato: "Corretor parceiro H", empresa: "net", categoria: "c-repasse", valor: R(7360), vencimento: d(5), conta: "k-net-1", origem: { tipo: "comissao", ref: "V-0142" } }),
    t({ tipo: "despesa", descricao: "Portal de anúncios · plano mensal", contato: "Portal Imóveis Já", empresa: "net", categoria: "c-portais", valor: R(1440), vencimento: d(0), conta: "k-net-1" }),
    t({ tipo: "despesa", descricao: "Anúncios patrocinados", contato: "Rede social", empresa: "net", categoria: "c-anuncios", valor: R(2150), vencimento: d(4), conta: "k-net-1" }),
    t({ tipo: "despesa", descricao: "Contabilidade mensal", contato: "Escritório Contábil Exemplo", empresa: "net", categoria: "c-contabil", valor: R(1890), vencimento: d(-3), conta: "k-net-2" }),
    t({ tipo: "despesa", descricao: "Cartório · certidões de matrícula", contato: "Cartório do 1º Ofício", empresa: "net", categoria: "", valor: R(286.4), vencimento: d(-6), conta: "k-net-2" }),
    t({ tipo: "despesa", descricao: "Manutenção do ar-condicionado", contato: "Refrigeração Exemplo", empresa: "net", categoria: "", valor: R(480), vencimento: d(12), conta: "k-net-2" }),
    // Despesas Sacra Cred
    t({ tipo: "despesa", descricao: "Sistema de simulação de crédito", contato: "Software Exemplo", empresa: "cred", categoria: "c-software", valor: R(420), vencimento: d(8), conta: "k-cred-1" }),
    t({ tipo: "despesa", descricao: "Despachante · registro de contrato", contato: "Despachante Exemplo", empresa: "cred", categoria: "c-cartorio", valor: R(690), vencimento: d(-1), conta: "k-cred-1" }),
  ];

  // Recorrências: aluguel, energia, folha e software (série mensal, passado e futuro)
  const serie = (base, sid, deltas) => deltas.map((delta, i) => t({ ...base, vencimento: somarMeses(base.vencimento, delta), serie: { id: sid, n: i + 1, total: deltas.length } }));
  titulos.push(
    ...serie({ tipo: "despesa", descricao: "Aluguel da sede", contato: "Imobiliária Locadora", empresa: "net", categoria: "c-aluguel", valor: R(6800), vencimento: `${mes}-10`, conta: "k-net-1" }, "s-aluguel", [-5, -4, -3, -2, -1, 0, 1, 2]),
    ...serie({ tipo: "despesa", descricao: "Energia e internet", contato: "Concessionária", empresa: "net", categoria: "c-energia", valor: R(940), vencimento: `${mes}-15`, conta: "k-net-1" }, "s-energia", [-5, -4, -3, -2, -1, 0, 1, 2]),
    ...serie({ tipo: "despesa", descricao: "Salários e encargos", contato: "Equipe administrativa", empresa: "net", categoria: "c-folha", valor: R(14200), vencimento: `${mes}-05`, conta: "k-net-1" }, "s-folha", [-5, -4, -3, -2, -1, 0, 1, 2]),
    ...serie({ tipo: "despesa", descricao: "Salários e encargos", contato: "Equipe Sacra Cred", empresa: "cred", categoria: "c-folha", valor: R(6100), vencimento: `${mes}-05`, conta: "k-cred-1" }, "s-folha-cred", [-5, -4, -3, -2, -1, 0, 1, 2]),
    ...serie({ tipo: "despesa", descricao: "Sistema de gestão", contato: "Software Exemplo", empresa: "net", categoria: "c-software", valor: R(389.9), vencimento: `${mes}-20`, conta: "k-net-2" }, "s-software", [-5, -4, -3, -2, -1, 0, 1, 2]),
  );
  // Receitas realizadas nos meses anteriores (para o DRE ter histórico)
  [-5, -4, -3, -2, -1].forEach((m, i) => {
    titulos.push(
      t({ tipo: "receita", descricao: "Comissões de venda do mês", contato: "Clientes diversos", empresa: "net", categoria: "c-com-venda", valor: R([41200, 38600, 52400, 33900, 47300][i]), vencimento: somarMeses(`${mes}-18`, m), conta: "k-net-1" }),
      t({ tipo: "receita", descricao: "Correspondente · contratos do mês", contato: "Banco parceiro Alfa", empresa: "cred", categoria: "c-correspondente", valor: R([8600, 7800, 9100, 6400, 10200][i]), vencimento: somarMeses(`${mes}-22`, m), conta: "k-cred-1" }),
      t({ tipo: "despesa", descricao: "Repasse a corretores do mês", contato: "Corretores parceiros", empresa: "net", categoria: "c-repasse", valor: R([16480, 15440, 20960, 13560, 18920][i]), vencimento: somarMeses(`${mes}-24`, m), conta: "k-net-1" }),
    );
  });

  // Baixas: tudo que venceu antes do mês atual foi pago; no mês, alguns pagos e um parcial.
  let b = 0;
  const baixas = [];
  for (const x of titulos) {
    if (x.vencimento < inicioMes && x.vencimento < hoje) baixas.push({ id: `b-demo-${++b}`, titulo: x.id, valor: x.valor, data: x.vencimento, conta: x.conta, extrato: null, nota: "", estornoDe: null });
  }
  const pagar = (descr, fracao = 1) => {
    const x = titulos.find((y) => y.descricao === descr && y.vencimento >= inicioMes && y.vencimento <= hoje);
    if (x) baixas.push({ id: `b-demo-${++b}`, titulo: x.id, valor: Math.round(x.valor * fracao), data: x.vencimento, conta: x.conta, extrato: null, nota: "", estornoDe: null });
  };
  pagar("Aluguel da sede");
  pagar("Salários e encargos");
  pagar("Energia e internet");
  pagar("Correspondente · contrato liberado");
  pagar("Estudo comercial de preço");
  pagar("Captação · Casa Lago Norte", 0.5);

  // Fatura de cartão aberta (mês atual), com uma compra sem categoria e uma parcelada.
  const faturas = [{ id: "f-demo-1", cartao: "cc-1", competencia: mes, vencimento: somarDias(somarMeses(inicioMes, 1), 4), status: "aberta", titulo: null }];
  const compras = [
    { id: "c-demo-1", fatura: "f-demo-1", data: d(-18), loja: "UBER TRIP", valor: R(134.9), parcela: 1, parcelas: 1, categoria: "c-transporte" },
    { id: "c-demo-2", fatura: "f-demo-1", data: d(-15), loja: "CANVA PRO", valor: R(755), parcela: 2, parcelas: 3, categoria: "c-software" },
    { id: "c-demo-3", fatura: "f-demo-1", data: d(-11), loja: "RESTAURANTE SABOR DO CERRADO", valor: R(212.4), parcela: 1, parcelas: 1, categoria: "c-alimentacao" },
    { id: "c-demo-4", fatura: "f-demo-1", data: d(-8), loja: "MERCADO ONLINE LTDA", valor: R(421.5), parcela: 1, parcelas: 1, categoria: "" },
    { id: "c-demo-5", fatura: "f-demo-1", data: d(-4), loja: "POSTO AVENIDA", valor: R(260), parcela: 1, parcelas: 1, categoria: "c-transporte" },
  ];

  const transferencias = [
    { id: "tr-demo-1", de: "k-net-1", para: "k-net-2", valor: R(5000), data: d(-25), descricao: "Reforço de caixa", entreEmpresas: false },
  ];

  return {
    versao: 3,
    hoje,
    contas: CONTAS,
    categorias: CATEGORIAS,
    cartoes: CARTOES,
    titulos,
    baixas,
    transferencias,
    extrato: [],
    saldosExtrato: {},
    faturas,
    compras,
    regras: [{ id: "r-1", contem: "UBER", categoria: "c-transporte" }, { id: "r-2", contem: "POSTO", categoria: "c-transporte" }],
    auditoria: [{ id: "ev-0", em: `${hoje}T09:00:00.000Z`, quem: "Laboratório", acao: "Dados de demonstração", alvo: "", detalhe: "Base fictícia gerada para testes" }],
  };
}

/** Extrato OFX de exemplo da conta Banco Aurora · CC 1020, coerente com os dados acima. */
export function ofxExemplo(estado) {
  const hoje = estado.hoje;
  const titulo = (descr) => estado.titulos.find((t) => t.descricao === descr);
  const venda = titulo("Comissão · venda Edifício Jatobá");
  const portal = titulo("Portal de anúncios · plano mensal");
  const linhas = [
    { fitid: "AUR-0001", data: somarDias(hoje, -1), valor: venda.valor, memo: "PIX RECEBIDO CLIENTE VENDEDOR B" },
    { fitid: "AUR-0002", data: hoje, valor: -portal.valor, memo: "PAGTO BOLETO PORTAL IMOVEIS JA" },
    { fitid: "AUR-0003", data: somarDias(hoje, -2), valor: -3290, memo: "TARIFA PACOTE SERVICOS" },
    { fitid: "AUR-0004", data: somarDias(hoje, -1), valor: -18750, memo: "PIX ENVIADO GRAFICA EXEMPLO" },
  ];
  const f = (iso) => iso.replaceAll("-", "");
  // Saldo do banco = saldo do Vitral hoje + linhas que o Vitral ainda não registrou.
  const banco = saldoConta(estado, "k-net-1", hoje) + linhas.reduce((s, l) => s + l.valor, 0);
  const corpo = linhas.map((l) => `<STMTTRN>\n<TRNTYPE>${l.valor > 0 ? "CREDIT" : "DEBIT"}\n<DTPOSTED>${f(l.data)}120000\n<TRNAMT>${(l.valor / 100).toFixed(2)}\n<FITID>${l.fitid}\n<MEMO>${l.memo}\n</STMTTRN>`).join("\n");
  return `OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n<OFX>\n<BANKMSGSRSV1><STMTTRNRS><STMTRS>\n<CURDEF>BRL\n<BANKACCTFROM>\n<BANKID>999\n<ACCTID>1020\n</BANKACCTFROM>\n<BANKTRANLIST>\n<DTSTART>${f(somarDias(hoje, -3))}\n<DTEND>${f(hoje)}\n${corpo}\n</BANKTRANLIST>\n<LEDGERBAL>\n<BALAMT>${(banco / 100).toFixed(2)}\n<DTASOF>${f(hoje)}\n</LEDGERBAL>\n</STMTRS></STMTTRNRS></BANKMSGSRSV1>\n</OFX>\n`;
}

/** Fatura CSV de exemplo para o mês seguinte (com a parcela 3/3 da compra parcelada). */
export function faturaExemplo(estado) {
  const base = somarDias(estado.hoje, 2).split("-").reverse().join("/");
  return `data;estabelecimento;valor;parcela\n${base};UBER TRIP;48,70;\n${base};CANVA PRO;755,00;3/3\n${base};LIVRARIA CENTRAL;139,90;\n${base};POSTO AVENIDA;310,00;`;
}
