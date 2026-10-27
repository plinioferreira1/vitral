// Homologação das regras do laboratório: node --test laboratorio/financeiro/
import { test } from "node:test";
import assert from "node:assert/strict";
import * as F from "./core.js";
import { gerarDemo, ofxExemplo, faturaExemplo } from "./seed.js";

const HOJE = "2026-10-26";
const base = () => gerarDemo(HOJE);
const achar = (e, descr) => e.titulos.find((t) => t.descricao === descr);

test("dados de demonstração são coerentes", () => {
  const e = base();
  for (const t of e.titulos) assert.ok(F.pagoDe(e, t.id) <= t.valor, `${t.descricao} pago acima do valor`);
  for (const t of e.titulos) assert.ok(["net", "cred"].includes(t.empresa));
  assert.equal(e.titulos.filter((t) => !t.categoria).length, 2);
});

test("criar exige empresa e valor; série mensal gera as datas", () => {
  const e = base();
  assert.throws(() => F.criarTitulo(e, { tipo: "despesa", descricao: "X", valor: 100, vencimento: HOJE }), /empresa/);
  assert.throws(() => F.criarTitulo(e, { tipo: "despesa", descricao: "X", valor: 0, empresa: "net", vencimento: HOJE }), /maior que zero/);
  assert.throws(() => F.criarTitulo(e, { tipo: "despesa", descricao: "X", valor: 100, empresa: "cred", vencimento: HOJE, conta: "k-net-1" }), /outra empresa/);
  const { estado, ids } = F.criarTitulo(e, { tipo: "despesa", descricao: "Seguro", valor: 31000, empresa: "net", vencimento: "2026-01-31", repete: { vezes: 3, meses: 1 } });
  assert.equal(ids.length, 3);
  assert.deepEqual(ids.map((id) => estado.titulos.find((t) => t.id === id).vencimento), ["2026-01-31", "2026-02-28", "2026-03-31"]);
  assert.equal(estado.auditoria[0].acao, "Série criada");
});

test("aviso de duplicidade", () => {
  const e = base();
  const portal = achar(e, "Portal de anúncios · plano mensal");
  assert.equal(F.possiveisDuplicados(e, { ...portal, vencimento: F.somarDias(portal.vencimento, 2) }).length, 1);
  assert.equal(F.possiveisDuplicados(e, { ...portal, valor: portal.valor + 1 }).length, 0);
});

test("baixa parcial, trava no saldo, situação calculada", () => {
  let e = base();
  const t = achar(e, "Anúncios patrocinados");
  e = F.registrarBaixa(e, { titulo: t.id, valor: 100000, data: HOJE, conta: "k-net-1" });
  assert.equal(F.situacao(e, t, HOJE), "parcial");
  assert.equal(F.saldoTitulo(e, t), 115000);
  assert.throws(() => F.registrarBaixa(e, { titulo: t.id, valor: 115001, data: HOJE, conta: "k-net-1" }), /passa do saldo/);
  assert.throws(() => F.registrarBaixa(e, { titulo: t.id, valor: 1000, data: HOJE, conta: "k-cred-1" }), /outra empresa/);
  e = F.registrarBaixa(e, { titulo: t.id, valor: 115000, data: HOJE, conta: "k-net-1" });
  assert.equal(F.situacao(e, t, HOJE), "pago");
  assert.throws(() => F.registrarBaixa(e, { titulo: t.id, valor: 1, data: HOJE, conta: "k-net-1" }), /quitado/);
});

test("estorno preserva a baixa original e devolve o saldo", () => {
  let e = base();
  const t = achar(e, "Anúncios patrocinados");
  const antes = F.saldoConta(e, "k-net-1");
  e = F.registrarBaixa(e, { titulo: t.id, valor: t.valor, data: HOJE, conta: "k-net-1" });
  assert.equal(F.saldoConta(e, "k-net-1"), antes - t.valor);
  const baixa = e.baixas.at(-1);
  assert.throws(() => F.estornarBaixa(e, { baixa: baixa.id, motivo: "" }), /motivo/);
  e = F.estornarBaixa(e, { baixa: baixa.id, motivo: "Boleto pago em duplicidade" });
  assert.equal(F.saldoConta(e, "k-net-1"), antes);
  assert.equal(F.situacao(e, t, HOJE), "aberto");
  assert.ok(e.baixas.some((b) => b.id === baixa.id), "baixa original continua no histórico");
  assert.throws(() => F.estornarBaixa(e, { baixa: baixa.id, motivo: "de novo" }), /já foi estornada/);
});

test("cancelamento exige estorno antes e guarda motivo", () => {
  let e = base();
  const pago = e.titulos.find((t) => F.pagoDe(e, t.id) > 0);
  assert.throws(() => F.cancelarTitulo(e, { id: pago.id, motivo: "x" }), /estorne/);
  const aberto = achar(e, "Manutenção do ar-condicionado");
  e = F.cancelarTitulo(e, { id: aberto.id, motivo: "Serviço não realizado" });
  assert.equal(F.situacao(e, e.titulos.find((t) => t.id === aberto.id), HOJE), "cancelado");
  assert.throws(() => F.registrarBaixa(e, { titulo: aberto.id, valor: 100, data: HOJE, conta: "k-net-2" }), /cancelado/);
});

test("quitar em lote paga só o saldo de cada um e pula os quitados", () => {
  let e = base();
  const a = achar(e, "Anúncios patrocinados");
  const b = achar(e, "Portal de anúncios · plano mensal");
  const quitado = e.titulos.find((t) => F.situacao(e, t, HOJE) === "pago");
  const r = F.quitarLote(e, { ids: [a.id, b.id, quitado.id], data: HOJE, conta: "k-net-1" });
  assert.deepEqual(r.feitos, [a.id, b.id]);
  assert.deepEqual(r.pulados, [quitado.id]);
  e = r.estado;
  assert.equal(F.saldoTitulo(e, a) + F.saldoTitulo(e, b), 0);
});

test("transferência movimenta as contas e não entra no resultado", () => {
  let e = base();
  const meses = [F.mesDe(HOJE)];
  const dreAntes = F.dre(e, { meses });
  const totalAntes = F.saldoEmpresas(e, "todas");
  e = F.transferir(e, { de: "k-net-1", para: "k-cred-1", valor: 300000, data: HOJE });
  assert.equal(F.saldoEmpresas(e, "todas"), totalAntes);
  assert.equal(F.saldoEmpresas(e, "cred"), F.saldoEmpresas(base(), "cred") + 300000);
  assert.deepEqual(F.dre(e, { meses }).resultado, dreAntes.resultado);
  assert.equal(e.transferencias[0].entreEmpresas, true);
  assert.throws(() => F.transferir(e, { de: "k-net-1", para: "k-net-1", valor: 1, data: HOJE }), /diferentes/);
});

test("OFX: leitura, prévia sem duplicadas e conciliação", () => {
  let e = base();
  const ofx = F.lerOFX(ofxExemplo(e));
  assert.equal(ofx.transacoes.length, 4);
  assert.equal(ofx.conta, "1020");
  assert.throws(() => F.lerOFX("não é ofx"), /OFX/);
  e = F.importarExtrato(e, "k-net-1", ofx);
  assert.equal(F.previaExtrato(e, "k-net-1", ofx).duplicadas.length, 4);
  assert.throws(() => F.importarExtrato(e, "k-net-1", ofx), /já foram importadas/);

  const linhaVenda = e.extrato.find((l) => l.fitid === "AUR-0001");
  const sug = F.sugestoes(e, linhaVenda, HOJE);
  assert.equal(sug[0].titulo.descricao, "Comissão · venda Edifício Jatobá");
  assert.ok(sug[0].exato);

  const errado = achar(e, "Anúncios patrocinados");
  assert.throws(() => F.conciliar(e, { linha: linhaVenda.id, titulos: [errado.id] }), /não se misturam/);
  e = F.conciliar(e, { linha: linhaVenda.id, titulos: [sug[0].titulo.id] });
  assert.equal(F.situacao(e, sug[0].titulo, HOJE), "pago");
  assert.equal(e.extrato.find((l) => l.id === linhaVenda.id).status, "conciliado");

  // Divergência: banco tem tarifa e PIX ainda não lançados no Vitral.
  const portal = e.extrato.find((l) => l.fitid === "AUR-0002");
  e = F.conciliar(e, { linha: portal.id, titulos: [achar(e, "Portal de anúncios · plano mensal").id] });
  assert.equal(F.divergencia(e, "k-net-1").diferenca, -(3290 + 18750));
  const tarifa = e.extrato.find((l) => l.fitid === "AUR-0003");
  e = F.criarDoExtrato(e, { linha: tarifa.id, descricao: "Tarifa bancária", categoria: "c-tarifas" });
  const grafica = e.extrato.find((l) => l.fitid === "AUR-0004");
  e = F.criarDoExtrato(e, { linha: grafica.id, descricao: "Gráfica · folhetos", categoria: "c-anuncios" });
  assert.equal(F.divergencia(e, "k-net-1").diferenca, 0);

  // Desfazer conciliação estorna com registro e reabre a linha.
  e = F.desfazerConciliacao(e, linhaVenda.id);
  assert.equal(e.extrato.find((l) => l.id === linhaVenda.id).status, "pendente");
  assert.equal(F.situacao(e, sug[0].titulo, HOJE), "vencido");
  assert.ok(e.auditoria.some((a) => a.acao === "Estorno" && a.detalhe.includes("Conciliação desfeita")));
});

test("cartão: fatura repetida recusada, fechar exige categorias e não duplica despesa", () => {
  let e = base();
  const meses = [F.mesDe(HOJE)];
  assert.throws(() => F.fecharFatura(e, "f-demo-1"), /sem categoria/);
  const despesasAntes = F.dre(e, { meses }).totalDespesas[meses[0]];
  e = F.categorizarCompra(e, { compra: "c-demo-4", categoria: "c-alimentacao", lembrar: true });
  assert.equal(F.sugerirCategoria(e, "MERCADO ONLINE OUTRA"), "c-alimentacao");
  e = F.fecharFatura(e, "f-demo-1");
  const fatura = e.titulos.find((t) => t.natureza === "fatura");
  assert.equal(fatura.valor, e.compras.filter((c) => c.fatura === "f-demo-1").reduce((s, c) => s + c.valor, 0));
  assert.equal(F.dre(e, { meses }).totalDespesas[meses[0]], despesasAntes, "pagar a fatura não soma de novo as compras");
  assert.equal(F.parcelasFuturas(e, "f-demo-1").length, 1);

  const { compras, erros } = F.lerFaturaCSV(faturaExemplo(e));
  assert.equal(compras.length, 4);
  assert.equal(erros.length, 0);
  assert.equal(compras[1].parcela, 3);
  const prox = F.mesDe(F.somarMeses(`${meses[0]}-01`, 1));
  e = F.importarFatura(e, { cartao: "cc-1", competencia: prox, vencimento: F.somarMeses(HOJE, 1), compras });
  assert.throws(() => F.importarFatura(e, { cartao: "cc-1", competencia: prox, vencimento: HOJE, compras }), /já foi importada/);
  assert.equal(e.compras.find((c) => c.loja === "UBER TRIP" && c.fatura !== "f-demo-1").categoria, "c-transporte");
});

test("relatórios: DRE por empresa soma o consolidado; projeção usa o saldo atual", () => {
  const e = base();
  const meses = [-2, -1, 0].map((m) => F.mesDe(F.somarMeses(HOJE, m)));
  const todas = F.dre(e, { meses });
  const net = F.dre(e, { empresa: "net", meses });
  const cred = F.dre(e, { empresa: "cred", meses });
  for (const m of meses) assert.equal(net.resultado[m] + cred.resultado[m], todas.resultado[m]);
  const p = F.projecao(e, { hoje: HOJE, dias: 90 });
  assert.equal(p.pontos.length, 91);
  assert.equal(p.pontos[0].saldo, F.saldoEmpresas(e, "todas", HOJE) + [...e.titulos].filter((t) => t.status !== "cancelado" && t.vencimento <= HOJE).reduce((s, t) => s + (t.tipo === "receita" ? 1 : -1) * F.saldoTitulo(e, t), 0));
  const pr = F.previstoRealizado(e, { meses });
  assert.ok(pr[0].realizadoDespesa > 0);
});

test("moeda e conversões", () => {
  assert.equal(F.centavos("1.234,56"), 123456);
  assert.equal(F.centavos("R$ 10"), 1000);
  assert.ok(Number.isNaN(F.centavos("abc")));
  assert.equal(F.moeda(-123456), "−R$ 1.234,56");
  assert.equal(F.somarMeses("2026-01-31", 1), "2026-02-28");
});
