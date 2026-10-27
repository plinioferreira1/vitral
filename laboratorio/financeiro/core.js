// Vitral · Laboratório do Financeiro — regras financeiras (funções puras).
// Valores sempre em centavos inteiros. Nada aqui toca a tela nem o navegador:
// cada operação recebe o estado e devolve um estado novo (ou lança ErroFinanceiro).

export class ErroFinanceiro extends Error {}

const falha = (mensagem) => { throw new ErroFinanceiro(mensagem); };

export const EMPRESAS = [
  { id: "net", nome: "Sacra Netimóveis", curto: "Netimóveis" },
  { id: "cred", nome: "Sacra Cred", curto: "Sacra Cred" },
];

// ---------------------------------------------------------------- utilidades

export function moeda(centavos, { sinal = false } = {}) {
  const v = (Number(centavos) || 0) / 100;
  const txt = Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (v < 0) return `−${txt}`;
  return sinal && v > 0 ? `+${txt}` : txt;
}

/** "1.234,56", "1234.56", "1234" → centavos. Inválido → NaN. */
export function centavos(texto) {
  const t = String(texto ?? "").trim().replace(/^R\$\s*/, "");
  if (!t) return NaN;
  const n = /,\d{1,2}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(n)) return NaN;
  return Math.round(Number(n) * 100);
}

export const dataBR = (iso) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

export function somarDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function somarMeses(iso, meses) {
  const [a, m, d] = iso.split("-").map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1, 12));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0, 12)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}

export const diasEntre = (de, ate) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 864e5);
export const mesDe = (iso) => iso.slice(0, 7);
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const nomeMes = (aaaaMm) => `${MESES[Number(aaaaMm.slice(5, 7)) - 1]}/${aaaaMm.slice(2, 4)}`;

let contador = 0;
export const novoId = (prefixo) => `${prefixo}-${Date.now().toString(36)}-${(contador++).toString(36)}`;

const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function auditar(estado, acao, alvo, detalhe, quem = "Você (demonstração)") {
  return {
    ...estado,
    auditoria: [{ id: novoId("ev"), em: new Date().toISOString(), quem, acao, alvo, detalhe }, ...estado.auditoria],
  };
}

const porId = (lista, id) => lista.find((x) => x.id === id);
export const nomeEmpresa = (id) => porId(EMPRESAS, id)?.nome ?? "Sem empresa";
export const filtraEmpresa = (empresa) => (x) => empresa === "todas" || x.empresa === empresa;

// ---------------------------------------------------------------- títulos e baixas

/** Soma das baixas (estornos entram negativos). */
export function pagoDe(estado, tituloId) {
  return estado.baixas.filter((b) => b.titulo === tituloId).reduce((s, b) => s + b.valor, 0);
}

export function saldoTitulo(estado, titulo) {
  return Math.max(0, titulo.valor - pagoDe(estado, titulo.id));
}

/** Situação calculada — nunca digitada. */
export function situacao(estado, titulo, hoje) {
  if (titulo.status === "cancelado") return "cancelado";
  const pago = pagoDe(estado, titulo.id);
  if (pago >= titulo.valor) return "pago";
  if (titulo.vencimento < hoje) return "vencido";
  if (pago > 0) return "parcial";
  return "aberto";
}

export function possiveisDuplicados(estado, dados) {
  return estado.titulos.filter((t) =>
    t.status !== "cancelado" && t.tipo === dados.tipo && t.valor === dados.valor &&
    t.empresa === dados.empresa && Math.abs(diasEntre(t.vencimento, dados.vencimento)) <= 3 &&
    (semAcento(t.contato) === semAcento(dados.contato) || semAcento(t.descricao) === semAcento(dados.descricao)));
}

function validarTitulo(estado, d) {
  if (!["receita", "despesa"].includes(d.tipo)) falha("Escolha se é receita ou despesa.");
  if (!String(d.descricao ?? "").trim()) falha("Informe a descrição.");
  if (!Number.isInteger(d.valor) || d.valor <= 0) falha("Informe um valor maior que zero.");
  if (!porId(EMPRESAS, d.empresa)) falha("Escolha a empresa: Sacra Netimóveis ou Sacra Cred.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.vencimento ?? "")) falha("Informe o vencimento.");
  if (d.conta && porId(estado.contas, d.conta)?.empresa !== d.empresa) falha("A conta escolhida é de outra empresa.");
}

/** Cria um título (ou uma série, se `repete` vier preenchido). */
export function criarTitulo(estado, dados) {
  validarTitulo(estado, dados);
  const vezes = dados.repete ? Math.min(Math.max(Number(dados.repete.vezes) || 1, 1), 60) : 1;
  const serie = vezes > 1 ? novoId("serie") : null;
  const novos = Array.from({ length: vezes }, (_, i) => ({
    id: novoId("t"),
    tipo: dados.tipo,
    descricao: dados.descricao.trim(),
    contato: (dados.contato ?? "").trim(),
    empresa: dados.empresa,
    categoria: dados.categoria || "",
    valor: dados.valor,
    vencimento: i === 0 ? dados.vencimento : somarMeses(dados.vencimento, i * (dados.repete?.meses ?? 1)),
    competencia: mesDe(i === 0 ? (dados.competencia || dados.vencimento) : somarMeses(dados.vencimento, i * (dados.repete?.meses ?? 1))),
    conta: dados.conta || "",
    status: "ativo",
    natureza: dados.natureza ?? "normal",
    origem: dados.origem ?? null,
    serie: serie ? { id: serie, n: i + 1, total: vezes } : null,
    criadoEm: new Date().toISOString(),
  }));
  const proximo = { ...estado, titulos: [...novos, ...estado.titulos] };
  return {
    estado: auditar(proximo, vezes > 1 ? "Série criada" : "Lançamento criado", novos[0].id,
      `${dados.tipo === "receita" ? "Receita" : "Despesa"} "${dados.descricao.trim()}" de ${moeda(dados.valor)}${vezes > 1 ? ` · ${vezes} vezes` : ""} · ${nomeEmpresa(dados.empresa)}`),
    ids: novos.map((t) => t.id),
  };
}

export function editarTitulo(estado, id, mudancas) {
  const atual = porId(estado.titulos, id) ?? falha("Lançamento não encontrado.");
  if (atual.status === "cancelado") falha("Lançamento cancelado não pode ser editado.");
  const pago = pagoDe(estado, id);
  const novo = { ...atual, ...mudancas };
  validarTitulo(estado, novo);
  if (novo.valor < pago) falha(`O valor não pode ficar abaixo do que já foi baixado (${moeda(pago)}).`);
  const campos = Object.keys(mudancas).filter((k) => JSON.stringify(atual[k]) !== JSON.stringify(novo[k]));
  if (!campos.length) return estado;
  const descr = campos.map((k) => `${k}: ${k === "valor" ? `${moeda(atual[k])} → ${moeda(novo[k])}` : `${atual[k] || "—"} → ${novo[k] || "—"}`}`).join(" · ");
  return auditar({ ...estado, titulos: estado.titulos.map((t) => (t.id === id ? novo : t)) }, "Lançamento editado", id, descr);
}

export function registrarBaixa(estado, { titulo: tituloId, valor, data, conta, extrato = null, nota = "" }) {
  const titulo = porId(estado.titulos, tituloId) ?? falha("Lançamento não encontrado.");
  if (titulo.status === "cancelado") falha("Este lançamento está cancelado: reative antes de dar baixa.");
  if (!Number.isInteger(valor) || valor <= 0) falha("Informe um valor maior que zero.");
  const saldo = saldoTitulo(estado, titulo);
  if (saldo === 0) falha("Este lançamento já está quitado.");
  if (valor > saldo) falha(`O valor passa do saldo em aberto (${moeda(saldo)}).`);
  const c = porId(estado.contas, conta) ?? falha("Escolha a conta bancária.");
  if (c.empresa !== titulo.empresa) falha("A conta é de outra empresa. Use uma transferência entre empresas.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data ?? "")) falha("Informe a data.");
  const baixa = { id: novoId("b"), titulo: tituloId, valor, data, conta, extrato, nota, estornoDe: null };
  const parcial = valor < saldo;
  return auditar({ ...estado, baixas: [...estado.baixas, baixa] },
    titulo.tipo === "receita" ? (parcial ? "Recebimento parcial" : "Recebimento") : (parcial ? "Pagamento parcial" : "Pagamento"),
    tituloId, `${moeda(valor)} em ${dataBR(data)} · ${c.nome}${extrato ? " · pelo extrato" : ""}`);
}

/** Estorno = baixa de sentido contrário, com motivo. A baixa original continua no histórico. */
export function estornarBaixa(estado, { baixa: baixaId, motivo }) {
  const b = porId(estado.baixas, baixaId) ?? falha("Baixa não encontrada.");
  if (b.estornoDe) falha("Um estorno não pode ser estornado.");
  if (estado.baixas.some((x) => x.estornoDe === baixaId)) falha("Esta baixa já foi estornada.");
  if (!String(motivo ?? "").trim()) falha("Informe o motivo do estorno.");
  const estorno = { id: novoId("b"), titulo: b.titulo, valor: -b.valor, data: b.data, conta: b.conta, extrato: null, nota: motivo.trim(), estornoDe: baixaId };
  let proximo = { ...estado, baixas: [...estado.baixas, estorno] };
  if (b.extrato) proximo = { ...proximo, extrato: proximo.extrato.map((l) => (l.id === b.extrato ? { ...l, status: "pendente", baixas: l.baixas.filter((x) => x !== baixaId) } : l)) };
  return auditar(proximo, "Estorno", b.titulo, `${moeda(b.valor)} de ${dataBR(b.data)} · motivo: ${motivo.trim()}`);
}

export const baixaEstornada = (estado, baixaId) => estado.baixas.some((x) => x.estornoDe === baixaId);

export function quitarLote(estado, { ids, data, conta }) {
  let proximo = estado;
  const feitos = [];
  const pulados = [];
  for (const id of ids) {
    const t = porId(proximo.titulos, id);
    const saldo = t ? saldoTitulo(proximo, t) : 0;
    if (!t || t.status === "cancelado" || saldo === 0) { pulados.push(id); continue; }
    const contaDoTitulo = conta && porId(proximo.contas, conta)?.empresa === t.empresa ? conta
      : (t.conta || proximo.contas.find((c) => c.empresa === t.empresa)?.id);
    proximo = registrarBaixa(proximo, { titulo: id, valor: saldo, data, conta: contaDoTitulo });
    feitos.push(id);
  }
  if (!feitos.length) falha("Nenhum dos selecionados tem saldo em aberto.");
  return { estado: proximo, feitos, pulados };
}

export function cancelarTitulo(estado, { id, motivo }) {
  const t = porId(estado.titulos, id) ?? falha("Lançamento não encontrado.");
  if (t.status === "cancelado") falha("Já está cancelado.");
  if (pagoDe(estado, id) > 0) falha("Há baixas neste lançamento: estorne-as antes de cancelar.");
  if (!String(motivo ?? "").trim()) falha("Informe o motivo do cancelamento.");
  return auditar({ ...estado, titulos: estado.titulos.map((x) => (x.id === id ? { ...x, status: "cancelado" } : x)) }, "Cancelamento", id, motivo.trim());
}

export function reativarTitulo(estado, id) {
  const t = porId(estado.titulos, id) ?? falha("Lançamento não encontrado.");
  if (t.status !== "cancelado") return estado;
  return auditar({ ...estado, titulos: estado.titulos.map((x) => (x.id === id ? { ...x, status: "ativo" } : x)) }, "Reativação", id, "Voltou a ficar em aberto");
}

// ---------------------------------------------------------------- contas e transferências

/** Saldo de uma conta: saldo inicial + baixas + transferências (até a data, se informada). */
export function saldoConta(estado, contaId, ate = null) {
  const c = porId(estado.contas, contaId);
  if (!c) return 0;
  const dentro = (d) => !ate || d <= ate;
  let s = c.saldoInicial;
  for (const b of estado.baixas) {
    if (b.conta !== contaId || !dentro(b.data)) continue;
    const t = porId(estado.titulos, b.titulo);
    s += t?.tipo === "receita" ? b.valor : -b.valor;
  }
  for (const tr of estado.transferencias) {
    if (!dentro(tr.data)) continue;
    if (tr.para === contaId) s += tr.valor;
    if (tr.de === contaId) s -= tr.valor;
  }
  return s;
}

export function saldoEmpresas(estado, empresa, ate = null) {
  return estado.contas.filter(filtraEmpresa(empresa)).reduce((s, c) => s + saldoConta(estado, c.id, ate), 0);
}

export function transferir(estado, { de, para, valor, data, descricao = "" }) {
  const a = porId(estado.contas, de) ?? falha("Escolha a conta de origem.");
  const b = porId(estado.contas, para) ?? falha("Escolha a conta de destino.");
  if (de === para) falha("Origem e destino precisam ser contas diferentes.");
  if (!Number.isInteger(valor) || valor <= 0) falha("Informe um valor maior que zero.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data ?? "")) falha("Informe a data.");
  const entreEmpresas = a.empresa !== b.empresa;
  const tr = { id: novoId("tr"), de, para, valor, data, descricao: descricao.trim(), entreEmpresas };
  return auditar({ ...estado, transferencias: [tr, ...estado.transferencias] }, entreEmpresas ? "Transferência entre empresas" : "Transferência",
    tr.id, `${moeda(valor)} de ${a.nome} para ${b.nome} em ${dataBR(data)} · não entra como receita nem despesa`);
}

// ---------------------------------------------------------------- extrato OFX e conciliação

/** Lê OFX 1.x (SGML) ou 2.x (XML). Valores em centavos, datas aaaa-mm-dd. */
export function lerOFX(texto) {
  const txt = String(texto ?? "");
  if (!/<OFX>/i.test(txt)) falha("Arquivo não parece um extrato OFX.");
  const campo = (bloco, nome) => {
    const m = bloco.match(new RegExp(`<${nome}>([^<\\r\\n]*)`, "i"));
    return m ? m[1].trim() : "";
  };
  const data = (v) => (v && /^\d{8}/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : "");
  const transacoes = [];
  const blocos = txt.split(/<STMTTRN>/i).slice(1);
  for (const bruto of blocos) {
    const bloco = bruto.split(/<\/STMTTRN>/i)[0];
    const valor = centavos(campo(bloco, "TRNAMT"));
    const d = data(campo(bloco, "DTPOSTED"));
    const fitid = campo(bloco, "FITID");
    if (!Number.isFinite(valor) || !d) continue;
    transacoes.push({ fitid: fitid || `${d}|${valor}|${campo(bloco, "MEMO")}`, data: d, valor, memo: campo(bloco, "MEMO") || campo(bloco, "NAME") || "Sem descrição" });
  }
  const ledger = txt.split(/<LEDGERBAL>/i)[1] ?? "";
  return {
    banco: campo(txt, "BANKID") || campo(txt, "ORG"),
    conta: campo(txt, "ACCTID"),
    inicio: data(campo(txt, "DTSTART")),
    fim: data(campo(txt, "DTEND")),
    saldo: ledger ? { valor: centavos(campo(ledger, "BALAMT")), data: data(campo(ledger, "DTASOF")) } : null,
    transacoes,
  };
}

/** Prévia da importação: o que é novo e o que já foi importado (mesmo FITID na mesma conta). */
export function previaExtrato(estado, contaId, ofx) {
  const jaTem = new Set(estado.extrato.filter((l) => l.conta === contaId).map((l) => l.fitid));
  const vistos = new Set();
  const novas = [];
  const duplicadas = [];
  for (const t of ofx.transacoes) {
    if (jaTem.has(t.fitid) || vistos.has(t.fitid)) duplicadas.push(t);
    else { novas.push(t); vistos.add(t.fitid); }
  }
  return { novas, duplicadas };
}

export function importarExtrato(estado, contaId, ofx) {
  const conta = porId(estado.contas, contaId) ?? falha("Escolha a conta do extrato.");
  const { novas, duplicadas } = previaExtrato(estado, contaId, ofx);
  if (!novas.length) falha("Todas as linhas deste arquivo já foram importadas.");
  const linhas = novas.map((t) => ({ id: novoId("x"), conta: contaId, ...t, status: "pendente", baixas: [], nota: "" }));
  const proximo = { ...estado, extrato: [...linhas, ...estado.extrato], saldosExtrato: { ...estado.saldosExtrato, ...(ofx.saldo ? { [contaId]: ofx.saldo } : {}) } };
  return auditar(proximo, "Extrato importado", contaId, `${conta.nome}: ${novas.length} linhas novas${duplicadas.length ? ` · ${duplicadas.length} já importadas foram ignoradas` : ""}`);
}

/** Sugestões para uma linha do extrato: mesmo sentido, mesma empresa, saldo igual ao valor, perto do vencimento. */
export function sugestoes(estado, linha, hoje) {
  const conta = porId(estado.contas, linha.conta);
  const tipo = linha.valor > 0 ? "receita" : "despesa";
  const alvo = Math.abs(linha.valor);
  return estado.titulos
    .filter((t) => t.tipo === tipo && t.status !== "cancelado" && t.empresa === conta?.empresa && saldoTitulo(estado, t) > 0)
    .map((t) => {
      const saldo = saldoTitulo(estado, t);
      const dias = Math.abs(diasEntre(t.vencimento, linha.data));
      const texto = semAcento(`${t.descricao} ${t.contato}`);
      const palavras = semAcento(linha.memo).split(/[^a-z0-9]+/).filter((p) => p.length > 3);
      const nome = palavras.some((p) => texto.includes(p));
      const pontos = (saldo === alvo ? 60 : 0) + Math.max(0, 25 - dias * 2) + (nome ? 15 : 0);
      return { titulo: t, saldo, dias, pontos, exato: saldo === alvo };
    })
    .filter((s) => s.exato || s.pontos >= 30)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 4);
}

/** Concilia uma linha com um ou mais títulos: a soma dos saldos tem de bater com o valor da linha. */
export function conciliar(estado, { linha: linhaId, titulos }) {
  const linha = porId(estado.extrato, linhaId) ?? falha("Linha do extrato não encontrada.");
  if (linha.status !== "pendente") falha("Esta linha já foi tratada.");
  if (!titulos?.length) falha("Escolha ao menos um lançamento.");
  const tipo = linha.valor > 0 ? "receita" : "despesa";
  const lista = titulos.map((id) => porId(estado.titulos, id) ?? falha("Lançamento não encontrado."));
  if (lista.some((t) => t.tipo !== tipo)) falha("Receita e despesa não se misturam na mesma conciliação.");
  const total = lista.reduce((s, t) => s + saldoTitulo(estado, t), 0);
  if (total !== Math.abs(linha.valor)) falha(`A soma escolhida (${moeda(total)}) não bate com a linha do extrato (${moeda(Math.abs(linha.valor))}).`);
  let proximo = estado;
  const ids = [];
  for (const t of lista) {
    proximo = registrarBaixa(proximo, { titulo: t.id, valor: saldoTitulo(proximo, t), data: linha.data, conta: linha.conta, extrato: linha.id });
    ids.push(proximo.baixas.at(-1).id);
  }
  proximo = { ...proximo, extrato: proximo.extrato.map((l) => (l.id === linhaId ? { ...l, status: "conciliado", baixas: ids } : l)) };
  return auditar(proximo, "Conciliação", linhaId, `${linha.memo} · ${moeda(Math.abs(linha.valor))} ligado a ${lista.length} lançamento(s)`);
}

export function criarDoExtrato(estado, { linha: linhaId, descricao, categoria, contato = "" }) {
  const linha = porId(estado.extrato, linhaId) ?? falha("Linha do extrato não encontrada.");
  if (linha.status !== "pendente") falha("Esta linha já foi tratada.");
  const conta = porId(estado.contas, linha.conta);
  const { estado: comTitulo, ids } = criarTitulo(estado, {
    tipo: linha.valor > 0 ? "receita" : "despesa", descricao: descricao || linha.memo, contato, empresa: conta.empresa,
    categoria, valor: Math.abs(linha.valor), vencimento: linha.data, conta: linha.conta,
  });
  return conciliar(comTitulo, { linha: linhaId, titulos: ids });
}

export function ignorarLinha(estado, { linha: linhaId, motivo }) {
  const linha = porId(estado.extrato, linhaId) ?? falha("Linha do extrato não encontrada.");
  if (!String(motivo ?? "").trim()) falha("Diga por que esta linha fica fora (ex.: tarifa já lançada).");
  return auditar({ ...estado, extrato: estado.extrato.map((l) => (l.id === linhaId ? { ...l, status: "ignorado", nota: motivo.trim() } : l)) },
    "Linha ignorada", linhaId, `${linha.memo} · ${motivo.trim()}`);
}

export function desfazerConciliacao(estado, linhaId) {
  const linha = porId(estado.extrato, linhaId) ?? falha("Linha do extrato não encontrada.");
  if (linha.status === "ignorado") {
    return auditar({ ...estado, extrato: estado.extrato.map((l) => (l.id === linhaId ? { ...l, status: "pendente", nota: "" } : l)) }, "Linha reaberta", linhaId, linha.memo);
  }
  if (linha.status !== "conciliado") falha("Esta linha não está conciliada.");
  let proximo = estado;
  for (const b of linha.baixas) if (!baixaEstornada(proximo, b)) proximo = estornarBaixa(proximo, { baixa: b, motivo: "Conciliação desfeita" });
  return { ...proximo, extrato: proximo.extrato.map((l) => (l.id === linhaId ? { ...l, status: "pendente", baixas: [] } : l)) };
}

/** Diferença entre o saldo informado no último extrato e o saldo do Vitral na mesma data. */
export function divergencia(estado, contaId) {
  const ref = estado.saldosExtrato?.[contaId];
  if (!ref || !Number.isFinite(ref.valor)) return null;
  const sistema = saldoConta(estado, contaId, ref.data);
  return { data: ref.data, banco: ref.valor, sistema, diferenca: ref.valor - sistema };
}

// ---------------------------------------------------------------- cartão corporativo

/** CSV da fatura: data;estabelecimento;valor[;parcela "2/3"]. Cabeçalho opcional. */
export function lerFaturaCSV(texto) {
  const linhas = String(texto ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const compras = [];
  const erros = [];
  linhas.forEach((l, i) => {
    const partes = l.split(/;|\t/).map((p) => p.trim());
    if (i === 0 && /data/i.test(partes[0])) return;
    const [d, loja, v, parc] = partes;
    const iso = /^\d{2}\/\d{2}\/\d{4}$/.test(d) ? d.split("/").reverse().join("-") : /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
    const valor = centavos(v);
    if (!iso || !loja || !Number.isFinite(valor) || valor === 0) { erros.push(`Linha ${i + 1}: confira data, estabelecimento e valor.`); return; }
    const m = /^(\d+)\s*\/\s*(\d+)$/.exec(parc ?? "");
    compras.push({ data: iso, loja, valor, parcela: m ? Number(m[1]) : 1, parcelas: m ? Number(m[2]) : 1 });
  });
  return { compras, erros };
}

export function sugerirCategoria(estado, loja) {
  const chave = semAcento(loja).split(/\s+/)[0];
  const regra = estado.regras.find((r) => semAcento(loja).includes(semAcento(r.contem)));
  if (regra) return regra.categoria;
  const anterior = estado.compras.find((c) => c.categoria && semAcento(c.loja).split(/\s+/)[0] === chave);
  return anterior?.categoria ?? "";
}

export function importarFatura(estado, { cartao: cartaoId, competencia, vencimento, compras }) {
  const cartao = porId(estado.cartoes, cartaoId) ?? falha("Escolha o cartão.");
  if (!compras.length) falha("Nenhuma compra válida no arquivo.");
  if (estado.faturas.some((f) => f.cartao === cartaoId && f.competencia === competencia)) falha(`A fatura de ${nomeMes(competencia)} deste cartão já foi importada.`);
  const fatura = { id: novoId("f"), cartao: cartaoId, competencia, vencimento, status: "aberta", titulo: null };
  const novas = compras.map((c) => ({ id: novoId("c"), fatura: fatura.id, ...c, categoria: sugerirCategoria(estado, c.loja) }));
  return auditar({ ...estado, faturas: [fatura, ...estado.faturas], compras: [...novas, ...estado.compras] }, "Fatura importada", fatura.id,
    `${cartao.nome} · ${nomeMes(competencia)} · ${novas.length} compras · ${moeda(novas.reduce((s, c) => s + c.valor, 0))}`);
}

export function categorizarCompra(estado, { compra: compraId, categoria, lembrar = false }) {
  const c = porId(estado.compras, compraId) ?? falha("Compra não encontrada.");
  let proximo = { ...estado, compras: estado.compras.map((x) => (x.id === compraId ? { ...x, categoria } : x)) };
  if (lembrar && categoria) {
    const contem = c.loja.split(/\s+/)[0];
    proximo = { ...proximo, regras: [{ id: novoId("r"), contem, categoria }, ...proximo.regras.filter((r) => semAcento(r.contem) !== semAcento(contem))] };
  }
  return proximo;
}

/** Parcelas que ainda virão nas próximas faturas, a partir das compras parceladas desta. */
export function parcelasFuturas(estado, faturaId) {
  const f = porId(estado.faturas, faturaId);
  return estado.compras.filter((c) => c.fatura === faturaId && c.parcela < c.parcelas)
    .flatMap((c) => Array.from({ length: c.parcelas - c.parcela }, (_, i) => ({ loja: c.loja, valor: c.valor, parcela: c.parcela + i + 1, parcelas: c.parcelas, competencia: mesDe(somarMeses(`${f.competencia}-01`, i + 1)) })));
}

/** Fecha a fatura: as compras já são as despesas; nasce UM título a pagar (natureza "fatura"), fora do resultado. */
export function fecharFatura(estado, faturaId) {
  const f = porId(estado.faturas, faturaId) ?? falha("Fatura não encontrada.");
  if (f.status === "fechada") falha("Esta fatura já foi fechada.");
  const compras = estado.compras.filter((c) => c.fatura === faturaId);
  const semCategoria = compras.filter((c) => !c.categoria).length;
  if (semCategoria) falha(`Faltam ${semCategoria} compra(s) sem categoria.`);
  const cartao = porId(estado.cartoes, f.cartao);
  const total = compras.reduce((s, c) => s + c.valor, 0);
  const { estado: comTitulo, ids } = criarTitulo(estado, {
    tipo: "despesa", descricao: `Fatura ${cartao.nome} · ${nomeMes(f.competencia)}`, contato: cartao.banco, empresa: cartao.empresa,
    categoria: "", valor: total, vencimento: f.vencimento, conta: cartao.contaPagamento, natureza: "fatura", origem: { tipo: "fatura", ref: faturaId },
  });
  return auditar({ ...comTitulo, faturas: comTitulo.faturas.map((x) => (x.id === faturaId ? { ...x, status: "fechada", titulo: ids[0] } : x)) },
    "Fatura fechada", faturaId, `${compras.length} compras viraram despesas por categoria · 1 conta a pagar de ${moeda(total)}`);
}

// ---------------------------------------------------------------- relatórios

const categoriaDe = (estado, id) => porId(estado.categorias, id);

/**
 * DRE por competência. Entram: títulos ativos (exceto pagamento de fatura, que é
 * só a quitação do cartão) + compras de cartão (pela competência da fatura).
 * Transferências nunca entram.
 */
export function dre(estado, { empresa = "todas", meses }) {
  const linhas = new Map();
  const somar = (grupo, nome, tipo, mes, valor) => {
    const chave = `${tipo}|${grupo}|${nome}`;
    if (!linhas.has(chave)) linhas.set(chave, { tipo, grupo, nome, porMes: Object.fromEntries(meses.map((m) => [m, 0])) });
    if (mes in linhas.get(chave).porMes) linhas.get(chave).porMes[mes] += valor;
  };
  for (const t of estado.titulos) {
    if (t.status === "cancelado" || t.natureza === "fatura" || !filtraEmpresa(empresa)(t)) continue;
    const c = categoriaDe(estado, t.categoria);
    somar(c?.grupo ?? "Sem categoria", c?.nome ?? "Sem categoria", t.tipo, t.competencia, t.valor);
  }
  for (const compra of estado.compras) {
    const f = porId(estado.faturas, compra.fatura);
    const cartao = f && porId(estado.cartoes, f.cartao);
    if (!cartao || !filtraEmpresa(empresa)(cartao)) continue;
    const c = categoriaDe(estado, compra.categoria);
    somar(c?.grupo ?? "Sem categoria", c?.nome ?? "Sem categoria", "despesa", f.competencia, compra.valor);
  }
  const lista = [...linhas.values()].sort((a, b) => a.grupo.localeCompare(b.grupo) || a.nome.localeCompare(b.nome));
  const total = (tipo) => Object.fromEntries(meses.map((m) => [m, lista.filter((l) => l.tipo === tipo).reduce((s, l) => s + l.porMes[m], 0)]));
  const receitas = total("receita");
  const despesas = total("despesa");
  return { meses, receitas: lista.filter((l) => l.tipo === "receita"), despesas: lista.filter((l) => l.tipo === "despesa"), totalReceitas: receitas, totalDespesas: despesas,
    resultado: Object.fromEntries(meses.map((m) => [m, receitas[m] - despesas[m]])) };
}

/** Previsto (vencimentos do mês) x realizado (baixas do mês), por tipo. */
export function previstoRealizado(estado, { empresa = "todas", meses }) {
  return meses.map((m) => {
    const r = { mes: m, previstoReceita: 0, previstoDespesa: 0, realizadoReceita: 0, realizadoDespesa: 0 };
    for (const t of estado.titulos) {
      if (t.status === "cancelado" || !filtraEmpresa(empresa)(t) || mesDe(t.vencimento) !== m) continue;
      r[t.tipo === "receita" ? "previstoReceita" : "previstoDespesa"] += t.valor;
    }
    for (const b of estado.baixas) {
      const t = porId(estado.titulos, b.titulo);
      if (!t || !filtraEmpresa(empresa)(t) || mesDe(b.data) !== m) continue;
      r[t.tipo === "receita" ? "realizadoReceita" : "realizadoDespesa"] += b.valor;
    }
    return r;
  });
}

/** Saldo projetado dia a dia: saldo das contas hoje + saldos em aberto pelo vencimento (vencidos entram hoje). */
export function projecao(estado, { empresa = "todas", hoje, dias = 90 }) {
  const movimento = new Map();
  for (const t of estado.titulos) {
    if (t.status === "cancelado" || !filtraEmpresa(empresa)(t)) continue;
    const saldo = saldoTitulo(estado, t);
    if (!saldo) continue;
    const dia = t.vencimento < hoje ? hoje : t.vencimento;
    if (diasEntre(hoje, dia) > dias) continue;
    movimento.set(dia, (movimento.get(dia) ?? 0) + (t.tipo === "receita" ? saldo : -saldo));
  }
  let saldo = saldoEmpresas(estado, empresa, hoje);
  const pontos = [];
  for (let i = 0; i <= dias; i++) {
    const dia = somarDias(hoje, i);
    saldo += movimento.get(dia) ?? 0;
    pontos.push({ dia, saldo });
  }
  const menor = pontos.reduce((a, b) => (b.saldo < a.saldo ? b : a), pontos[0]);
  const primeiroNegativo = pontos.find((p) => p.saldo < 0) ?? null;
  return { pontos, menor, primeiroNegativo };
}

/** O que pede ação hoje, em ordem de urgência. */
export function pendencias(estado, { empresa = "todas", hoje }) {
  const ativos = estado.titulos.filter((t) => t.status !== "cancelado" && filtraEmpresa(empresa)(t));
  const abertos = ativos.filter((t) => saldoTitulo(estado, t) > 0);
  const contas = new Set(estado.contas.filter(filtraEmpresa(empresa)).map((c) => c.id));
  const cartoes = new Set(estado.cartoes.filter(filtraEmpresa(empresa)).map((c) => c.id));
  return {
    vencidos: abertos.filter((t) => t.vencimento < hoje),
    hoje: abertos.filter((t) => t.vencimento === hoje),
    semana: abertos.filter((t) => t.vencimento > hoje && diasEntre(hoje, t.vencimento) <= 7),
    semCategoria: ativos.filter((t) => !t.categoria && t.natureza !== "fatura"),
    extrato: estado.extrato.filter((l) => l.status === "pendente" && contas.has(l.conta)),
    faturas: estado.faturas.filter((f) => f.status === "aberta" && cartoes.has(f.cartao)),
  };
}

export function exportarCSV(linhas) {
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return "﻿" + linhas.map((l) => l.map(esc).join(";")).join("\r\n");
}
