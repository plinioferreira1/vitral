// Vitral · Laboratório do Financeiro — interface. Regras em core.js; dados fictícios em seed.js.
import * as F from "./core.js";
import { gerarDemo, ofxExemplo, faturaExemplo } from "./seed.js";

const CHAVE = "vitral-financeiro-lab-v3";
const hojeLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

// ---------------------------------------------------------------- estado

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    if (salvo?.versao === 3) return salvo;
  } catch { /* navegador sem armazenamento: segue com a demonstração */ }
  return gerarDemo(hojeLocal());
}
let E = carregar();
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch { /* sem armazenamento */ } };
salvar();
const HOJE = () => E.hoje;

const ui = {
  area: (location.hash.replace("#", "") || "painel"),
  empresa: "todas",
  busca: "",
  tipo: "todos",
  filtro: "abertos",
  sel: new Set(),
  extratoFiltro: "pendente",
  periodo: 6,
  tema: (() => { try { return localStorage.getItem(`${CHAVE}-tema`) || "atual"; } catch { return "atual"; } })(),
};

// ---------------------------------------------------------------- utilidades de tela

const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const M = (c, o) => esc(F.moeda(c, o));
const cat = (id) => E.categorias.find((c) => c.id === id);
const conta = (id) => E.contas.find((c) => c.id === id);
const titulo = (id) => E.titulos.find((t) => t.id === id);
const empresaCurta = (id) => F.EMPRESAS.find((e) => e.id === id)?.curto ?? "—";
const daEmpresa = F.filtraEmpresa;
const nomeEmpresaAtual = () => (ui.empresa === "todas" ? "Sacra Netimóveis e Sacra Cred" : F.nomeEmpresa(ui.empresa));

const ICONES = {
  painel: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z",
  contas: "M4 6h16M4 12h16M4 18h10M18 16l2 2-2 2",
  bancos: "M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18M12 3l9 5H3z",
  cartoes: "M3 6h18v12H3zM3 10h18M7 15h4",
  relatorios: "M5 20V10M12 20V4M19 20v-7",
  config: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-1.9.2 1.7 1.7 0 0 0-1 1.5V22h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9-.2l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.8A1.7 1.7 0 0 0 2.6 14H2.5v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 1.9-.2A1.7 1.7 0 0 0 8.8 2V2h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9.2l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.6 1z",
  mais: "M12 5v14M5 12h14",
  busca: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3",
  menu: "M4 7h16M4 12h16M4 17h16",
  fechar: "M6 6l12 12M18 6L6 18",
  seta: "M9 6l6 6-6 6",
};
const icone = (n) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[n]}"/></svg>`;

const AREAS = [
  { id: "painel", nome: "Painel", icone: "painel" },
  { id: "contas", nome: "Contas a pagar e receber", curto: "Contas", icone: "contas" },
  { id: "bancos", nome: "Bancos e conciliação", curto: "Bancos", icone: "bancos" },
  { id: "cartoes", nome: "Cartões", icone: "cartoes" },
  { id: "relatorios", nome: "Relatórios", icone: "relatorios" },
];

function toast(msg, erro = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = erro ? "erro mostrar" : "mostrar";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = erro ? "erro" : ""), erro ? 5200 : 3200);
}

/** Executa uma operação das regras; erro de regra vira aviso, nunca quebra a tela. */
function agir(fn, sucesso) {
  try {
    const r = fn();
    E = r?.estado ?? r;
    salvar();
    render();
    if (sucesso) toast(typeof sucesso === "function" ? sucesso(r) : sucesso);
    return true;
  } catch (e) {
    if (e instanceof F.ErroFinanceiro) { toast(e.message, true); return false; }
    throw e;
  }
}

const SITUACAO = {
  aberto: ["Em aberto", ""], parcial: ["Parcial", "marca"], vencido: ["Vencido", "perigo"], pago: ["Quitado", "ok"], cancelado: ["Cancelado", "sem"],
};
const pillSituacao = (s) => `<span class="pill ${SITUACAO[s][1]}">${SITUACAO[s][0]}</span>`;
const origemChip = (t) => t.origem?.tipo === "comissao" ? `<span class="chip">Processo ${esc(t.origem.ref)}</span>`
  : t.origem?.tipo === "correspondente" ? `<span class="chip">Financiamento ${esc(t.origem.ref)}</span>`
  : t.natureza === "fatura" ? `<span class="chip">Fatura do cartão</span>` : "";
const serieChip = (t) => (t.serie ? `<span class="chip">${t.serie.n}/${t.serie.total}</span>` : "");

// ---------------------------------------------------------------- estrutura fixa

function renderMenu() {
  const p = F.pendencias(E, { empresa: ui.empresa, hoje: HOJE() });
  const contagem = { contas: p.vencidos.length, bancos: p.extrato.length, cartoes: p.faturas.filter((f) => E.compras.some((c) => c.fatura === f.id && !c.categoria)).length };
  const item = (a) => `<button class="navitem" data-ir="${a.id}" ${ui.area === a.id ? 'aria-current="page"' : ""}>${icone(a.icone)}<span>${a.nome}</span>${contagem[a.id] ? `<span class="conta" title="Pede atenção">${contagem[a.id]}</span>` : ""}</button>`;
  $("#menu").innerHTML = `
    <div class="wordmark">vitral<span>.</span></div>
    <div class="workspace"><i>S</i><div><b>Sacra</b><div class="muted">Netimóveis · Cred</div></div></div>
    <div class="navlabel">Financeiro</div>
    ${AREAS.map(item).join("")}
    <div class="navlabel">Ajustes</div>
    <button class="navitem" data-ir="config" ${ui.area === "config" ? 'aria-current="page"' : ""}>${icone("config")}<span>Configurações</span></button>
    <div class="sidebar-fim">Laboratório de design.<br>Dados fictícios guardados só neste navegador.</div>`;
  $("#barra-movel").innerHTML = AREAS.map((a) => `<button data-ir="${a.id}" ${ui.area === a.id ? 'aria-current="page"' : ""}>${icone(a.icone)}<span>${a.curto ?? a.nome}</span></button>`).join("");
}

function renderTopo() {
  const area = [...AREAS, { id: "config", nome: "Configurações" }].find((a) => a.id === ui.area);
  $("#topo").innerHTML = `
    <button class="icone-btn menu-movel" data-acao="menu" aria-label="Abrir menu">${icone("menu")}</button>
    <div class="crumb">Financeiro / <b>${esc(area?.nome)}</b></div>
    <span class="grow"></span>
    <div class="segmented" role="group" aria-label="Empresa">
      ${[["todas", "Consolidado"], ["net", "Netimóveis"], ["cred", "Sacra Cred"]].map(([v, r]) => `<button data-empresa="${v}" aria-pressed="${ui.empresa === v}">${r}</button>`).join("")}
    </div>
    <label class="busca">${icone("busca")}<span class="sr-only">Buscar lançamento</span><input id="busca" type="search" placeholder="Buscar lançamento ou contato" value="${esc(ui.busca)}" autocomplete="off"></label>
    <button class="btn btn-novo" data-acao="novo">${icone("mais")}<span>Novo lançamento</span></button>`;
}

// ---------------------------------------------------------------- painel

function graficoCaixa(proj) {
  const W = 480, H = 240, esq = 50, dir = 12, cima = 16, baixo = 28;
  const vals = proj.pontos.map((p) => p.saldo);
  const temNegativo = Math.min(...vals) < 0;
  let min = Math.min(0, ...vals), max = Math.max(...vals);
  const folga = (max - min) * 0.08 || 100000;
  max += folga; if (temNegativo) min -= folga;
  const x = (i) => esq + (i / (proj.pontos.length - 1)) * (W - esq - dir);
  const y = (v) => cima + (1 - (v - min) / (max - min)) * (H - cima - baixo);
  const linha = proj.pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.saldo).toFixed(1)}`).join("");
  const area = `${linha}L${x(proj.pontos.length - 1).toFixed(1)} ${y(min).toFixed(1)}L${x(0)} ${y(min).toFixed(1)}Z`;
  const passo = Math.pow(10, Math.floor(Math.log10((max - min) / 4)));
  const ticksY = [];
  for (let v = Math.ceil(min / passo) * passo; v <= max; v += passo * Math.ceil((max - min) / passo / 4)) ticksY.push(v || 0);
  const iMenor = proj.pontos.indexOf(proj.menor);
  const fmtK = (c) => { const r = Math.round(c / 100) || 0; return Math.abs(r) >= 1000 ? `${(r / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil` : r.toLocaleString("pt-BR", { maximumFractionDigits: 0 }); };
  const ticksX = [0, 30, 60, 90].filter((i) => i < proj.pontos.length);
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Saldo projetado nos próximos 90 dias; menor saldo ${esc(F.moeda(proj.menor.saldo))} em ${F.dataBR(proj.menor.dia)}">
    ${ticksY.map((v) => `<line x1="${esq}" x2="${W - dir}" y1="${y(v)}" y2="${y(v)}" stroke="var(--chart-grid)"/><text x="${esq - 8}" y="${y(v) + 4}" text-anchor="end">${fmtK(v)}</text>`).join("")}
    ${temNegativo ? `<line x1="${esq}" x2="${W - dir}" y1="${y(0)}" y2="${y(0)}" stroke="var(--rose)" stroke-dasharray="4 4"/>` : ""}
    <path d="${area}" fill="var(--chart-line)" fill-opacity=".07"/>
    <path d="${linha}" fill="none" stroke="var(--chart-line)" stroke-width="2" stroke-linejoin="round"/>
    ${ticksX.map((i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${i === 0 ? "hoje" : F.dataBR(proj.pontos[i].dia).slice(0, 5)}</text>`).join("")}
    <line x1="${x(iMenor)}" x2="${x(iMenor)}" y1="${cima}" y2="${H - baixo}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3 3"/>
    <circle cx="${x(iMenor)}" cy="${y(proj.menor.saldo)}" r="5.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>
  </svg>`;
}

function painel() {
  const hoje = HOJE();
  const p = F.pendencias(E, { empresa: ui.empresa, hoje });
  const ativos = E.titulos.filter((t) => t.status !== "cancelado" && daEmpresa(ui.empresa)(t));
  const em30 = (tipo) => ativos.filter((t) => t.tipo === tipo && F.diasEntre(hoje, t.vencimento) <= 30).reduce((s, t) => s + F.saldoTitulo(E, t), 0);
  const nContas = E.contas.filter(daEmpresa(ui.empresa)).length;
  const mes = F.mesDe(hoje);
  const d = F.dre(E, { empresa: ui.empresa, meses: [mes] });
  const proj = F.projecao(E, { empresa: ui.empresa, hoje, dias: 90 });
  const saldoHoje = F.saldoEmpresas(E, ui.empresa, hoje);

  const linhaPend = (n, cor, tituloTxt, texto, acao, rotulo) => `<div class="pend"><span class="marca-pend ${cor}">${n}</span><div><h3>${tituloTxt}</h3><p>${texto}</p></div><button class="btn sec peq" ${acao}>${rotulo}</button></div>`;
  const soma = (l) => M(l.reduce((s, t) => s + F.saldoTitulo(E, t), 0));
  const pend = [
    p.vencidos.length && linhaPend(p.vencidos.length, "perigo", "Vencidos", `${soma(p.vencidos)} em aberto, o mais antigo de ${F.dataBR(p.vencidos.map((t) => t.vencimento).sort()[0])}`, 'data-ir="contas" data-filtro="vencidos"', "Ver vencidos"),
    p.hoje.length && linhaPend(p.hoje.length, "alerta", "Vencem hoje", `${soma(p.hoje)} · ${p.hoje.map((t) => esc(t.descricao)).slice(0, 2).join(" · ")}`, 'data-ir="contas" data-filtro="hoje"', "Dar baixa"),
    p.extrato.length && linhaPend(p.extrato.length, "marca", "Extrato a conciliar", "Linhas do banco esperando confirmação", 'data-ir="bancos"', "Conciliar"),
    p.semCategoria.length && linhaPend(p.semCategoria.length, "", "Sem categoria", "Ficam de fora do resultado por categoria", 'data-ir="contas" data-filtro="semcat"', "Classificar"),
    p.faturas.length && linhaPend(p.faturas.length, "", "Fatura de cartão aberta", "Revise as compras e feche a fatura", 'data-ir="cartoes"', "Revisar"),
    p.semana.length && linhaPend(p.semana.length, "", "Próximos 7 dias", `${soma(p.semana.filter((t) => t.tipo === "receita"))} a receber · ${soma(p.semana.filter((t) => t.tipo === "despesa"))} a pagar`, 'data-ir="contas" data-filtro="semana"', "Ver agenda"),
  ].filter(Boolean);

  const porEmpresa = ui.empresa !== "todas" ? "" : `
    <section class="painel">
      <div class="painel-cab"><div><h2>Por empresa</h2><p>Cada empresa com suas contas; transferências entre elas não viram receita.</p></div></div>
      <div class="tabela-wrap"><table>
        <thead><tr><th>Empresa</th><th class="valor">Saldo hoje</th><th class="valor">A receber 30 dias</th><th class="valor">A pagar 30 dias</th><th class="valor">Resultado do mês</th></tr></thead>
        <tbody>${F.EMPRESAS.map((emp) => {
          const at = E.titulos.filter((t) => t.status !== "cancelado" && t.empresa === emp.id);
          const s30 = (tipo) => at.filter((t) => t.tipo === tipo && F.diasEntre(hoje, t.vencimento) <= 30).reduce((s, t) => s + F.saldoTitulo(E, t), 0);
          const r = F.dre(E, { empresa: emp.id, meses: [mes] }).resultado[mes];
          return `<tr><td><b>${esc(emp.nome)}</b></td><td class="valor">${M(F.saldoEmpresas(E, emp.id, hoje))}</td><td class="valor in">${M(s30("receita"))}</td><td class="valor out">${M(s30("despesa"))}</td><td class="valor ${r < 0 ? "out" : ""}">${M(r)}</td></tr>`;
        }).join("")}</tbody>
      </table></div>
    </section>`;

  return `
    <div class="cabeca"><div><h1>Painel</h1><p>${esc(nomeEmpresaAtual())} · ${F.dataBR(hoje)}</p></div></div>
    <div class="statstrip">
      <div class="stat"><div class="rot">Saldo nas contas</div><div class="val">${M(saldoHoje)}</div><small>${nContas} conta${nContas === 1 ? "" : "s"} bancária${nContas === 1 ? "" : "s"}</small></div>
      <div class="stat"><div class="rot">A receber · 30 dias</div><div class="val in">${M(em30("receita"))}</div><small>inclui vencidos</small></div>
      <div class="stat"><div class="rot">A pagar · 30 dias</div><div class="val out">${M(em30("despesa"))}</div><small>inclui vencidos</small></div>
      <div class="stat"><div class="rot">Resultado de ${F.nomeMes(mes)}</div><div class="val ${d.resultado[mes] < 0 ? "out" : ""}">${M(d.resultado[mes])}</div><small>por competência</small></div>
    </div>
    <div class="grade">
      <section class="painel">
        <div class="painel-cab"><div><h2>Precisa de você</h2><p>Em ordem de urgência.</p></div></div>
        ${pend.length ? pend.join("") : `<div class="vazio-estado"><h3>Tudo em dia</h3><p>Nenhum vencido, extrato ou fatura esperando.</p></div>`}
      </section>
      <section class="painel">
        <div class="painel-cab"><div><h2>Caixa projetado</h2><p>Saldo de hoje mais o que vence nos próximos 90 dias.</p></div></div>
        <div class="painel-corpo">
          ${graficoCaixa(proj)}
          <p class="small" style="margin-top:10px">${proj.primeiroNegativo
            ? `<span class="pill perigo">Atenção</span> O saldo fica negativo em ${F.dataBR(proj.primeiroNegativo.dia)} (${M(proj.primeiroNegativo.saldo)}).`
            : `Menor saldo previsto: <b>${M(proj.menor.saldo)}</b> em ${F.dataBR(proj.menor.dia)}.`}</p>
          <h3 style="margin-top:18px">Maiores movimentos previstos</h3>
          ${ativos.filter((t) => F.saldoTitulo(E, t) > 0 && t.vencimento >= hoje && F.diasEntre(hoje, t.vencimento) <= 90).sort((a, b) => F.saldoTitulo(E, b) - F.saldoTitulo(E, a)).slice(0, 4)
            .map((t) => `<div class="baixa-item"><a href="#" data-abrir="${t.id}" style="color:inherit;text-decoration:none">${F.dataBR(t.vencimento).slice(0, 5)} · ${esc(t.descricao)}</a><b class="num ${t.tipo === "receita" ? "in" : "out"}">${M(t.tipo === "receita" ? F.saldoTitulo(E, t) : -F.saldoTitulo(E, t), { sinal: true })}</b></div>`).join("")}
        </div>
      </section>
    </div>
    ${porEmpresa}
    <section class="painel">
      <div class="painel-cab"><div><h2>Últimas ações</h2><p>Tudo o que muda no Financeiro fica registrado.</p></div><button class="btn ghost peq" data-ir="config" data-secao="historico">Ver histórico</button></div>
      <div class="painel-corpo">${listaHistorico(E.auditoria.slice(0, 6))}</div>
    </section>`;
}

function listaHistorico(eventos) {
  if (!eventos.length) return `<p class="muted small">Nada registrado ainda.</p>`;
  return `<ul class="linha-tempo">${eventos.map((ev) => {
    const quando = new Date(ev.em);
    return `<li><time datetime="${esc(ev.em)}">${quando.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time><div><b>${esc(ev.acao)}</b>${esc(ev.detalhe)}<div class="muted">${esc(ev.quem)}</div></div></li>`;
  }).join("")}</ul>`;
}

// ---------------------------------------------------------------- contas a pagar e receber

const FILTROS = [
  ["abertos", "Em aberto", (t, s) => ["aberto", "parcial", "vencido"].includes(s)],
  ["vencidos", "Vencidos", (t, s) => s === "vencido"],
  ["hoje", "Hoje", (t, s) => s !== "pago" && s !== "cancelado" && t.vencimento === HOJE()],
  ["semana", "Próximos 7 dias", (t, s) => s !== "pago" && s !== "cancelado" && t.vencimento >= HOJE() && F.diasEntre(HOJE(), t.vencimento) <= 7],
  ["pagos", "Quitados", (t, s) => s === "pago"],
  ["semcat", "Sem categoria", (t, s) => !t.categoria && t.natureza !== "fatura" && s !== "cancelado"],
  ["cancelados", "Cancelados", (t, s) => s === "cancelado"],
  ["todos", "Todos", () => true],
];

function titulosVisiveis(filtro = ui.filtro) {
  const busca = ui.busca.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const f = FILTROS.find((x) => x[0] === filtro)[2];
  return E.titulos
    .filter(daEmpresa(ui.empresa))
    .filter((t) => ui.tipo === "todos" || t.tipo === ui.tipo)
    .filter((t) => !busca || `${t.descricao} ${t.contato} ${cat(t.categoria)?.nome ?? ""}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(busca))
    .filter((t) => f(t, F.situacao(E, t, HOJE())))
    .sort((a, b) => (filtro === "pagos" ? b.vencimento.localeCompare(a.vencimento) : a.vencimento.localeCompare(b.vencimento)));
}

function seletorCategoria(t) {
  const opcoes = E.categorias.filter((c) => c.tipo === t.tipo);
  return `<select class="cat-select ${t.categoria ? "" : "vazio"}" data-categorizar="${t.id}" aria-label="Categoria de ${esc(t.descricao)}" ${t.status === "cancelado" ? "disabled" : ""}>
    <option value="">Classificar…</option>${opcoes.map((c) => `<option value="${c.id}" ${c.id === t.categoria ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select>`;
}

function contas() {
  const lista = titulosVisiveis();
  for (const id of [...ui.sel]) if (!lista.some((t) => t.id === id)) ui.sel.delete(id);
  const contagem = Object.fromEntries(FILTROS.map(([id]) => [id, titulosVisiveis(id).length]));
  const selecionados = lista.filter((t) => ui.sel.has(t.id));
  const totalSel = selecionados.reduce((s, t) => s + F.saldoTitulo(E, t), 0);
  const aReceber = lista.filter((t) => t.tipo === "receita").reduce((s, t) => s + F.saldoTitulo(E, t), 0);
  const aPagar = lista.filter((t) => t.tipo === "despesa").reduce((s, t) => s + F.saldoTitulo(E, t), 0);
  const mostrarEmpresa = ui.empresa === "todas";
  const linhas = lista.map((t) => {
    const s = F.situacao(E, t, HOJE());
    const saldo = F.saldoTitulo(E, t);
    const pago = F.pagoDe(E, t.id);
    return `<tr class="linha ${s === "cancelado" ? "cancelado" : ""}" data-abrir="${t.id}">
      <td class="ck"><input type="checkbox" class="check" data-sel="${t.id}" ${ui.sel.has(t.id) ? "checked" : ""} ${s === "pago" || s === "cancelado" ? "disabled" : ""} aria-label="Selecionar ${esc(t.descricao)}"></td>
      <td class="c-desc"><b>${esc(t.descricao)}</b> ${serieChip(t)}<small>${esc(t.contato || "Sem contato")} ${origemChip(t)}</small></td>
      <td class="c-meta">${F.dataBR(t.vencimento)}<small>${t.tipo === "receita" ? "A receber" : "A pagar"}${mostrarEmpresa ? ` · ${esc(empresaCurta(t.empresa))}` : ""}</small></td>
      <td class="c-cat">${t.natureza === "fatura" ? `<span class="muted small">Quitação do cartão</span>` : seletorCategoria(t)}</td>
      <td class="c-sit">${pillSituacao(s)}</td>
      <td class="valor ${t.tipo === "receita" ? "in" : "out"}">${M(s === "pago" ? t.valor : saldo)}${pago > 0 && saldo > 0 ? `<small>de ${M(t.valor)}</small>` : ""}</td>
    </tr>`;
  }).join("");

  return `
    <div class="cabeca"><div><h1>Contas a pagar e receber</h1><p>Uma lista só para receitas e despesas. Clique numa linha para ver, dar baixa, estornar ou editar.</p></div></div>
    <section class="painel">
      <div class="toolbar">
        <div class="segmented" role="group" aria-label="Tipo">${[["todos", "Tudo"], ["receita", "A receber"], ["despesa", "A pagar"]].map(([v, r]) => `<button data-tipo="${v}" aria-pressed="${ui.tipo === v}">${r}</button>`).join("")}</div>
        <div class="filtros" role="group" aria-label="Situação">${FILTROS.map(([id, nome]) => `<button class="filtro" data-filtro="${id}" aria-pressed="${ui.filtro === id}">${nome}<b>${contagem[id]}</b></button>`).join("")}</div>
        <span class="grow"></span>
        <button class="btn sec peq" data-acao="csv-titulos">Exportar CSV</button>
      </div>
      ${selecionados.length ? `<div class="lote" role="region" aria-label="Ações em lote"><b>${selecionados.length} selecionado${selecionados.length > 1 ? "s" : ""}</b><span>Saldo somado ${M(totalSel)}</span><span class="grow"></span><button class="btn peq" data-acao="lote">Quitar selecionados</button><button class="btn ghost peq" data-acao="limpar-sel">Limpar</button></div>` : ""}
      ${lista.length ? `<div class="tabela-wrap"><table class="cartoes">
        <thead><tr><th class="ck"><input type="checkbox" class="check" data-acao="sel-todos" aria-label="Selecionar todos com saldo" ${selecionados.length && selecionados.length === lista.filter((t) => F.saldoTitulo(E, t) > 0 && t.status !== "cancelado").length ? "checked" : ""}></th><th>Descrição</th><th>Vencimento</th><th>Categoria</th><th>Situação</th><th class="valor">Saldo</th></tr></thead>
        <tbody>${linhas}</tbody></table></div>
        <div class="rodape-tabela"><span>${lista.length} lançamento${lista.length > 1 ? "s" : ""}</span><span>A receber <b class="in">${M(aReceber)}</b> · A pagar <b class="out">${M(aPagar)}</b></span></div>`
      : `<div class="vazio-estado"><h3>Nada por aqui</h3><p>${ui.busca ? "Nenhum lançamento com esse termo. Limpe a busca ou troque o filtro." : "Nenhum lançamento nesta situação. Troque o filtro ou crie um lançamento."}</p><button class="btn sec peq" data-acao="novo">Novo lançamento</button></div>`}
    </section>`;
}

// ---------------------------------------------------------------- bancos e conciliação

function bancos() {
  const contasVis = E.contas.filter(daEmpresa(ui.empresa));
  const ids = new Set(contasVis.map((c) => c.id));
  const linhas = E.extrato.filter((l) => ids.has(l.conta));
  const filtradas = linhas.filter((l) => l.status === ui.extratoFiltro).sort((a, b) => b.data.localeCompare(a.data));
  const cont = { pendente: 0, conciliado: 0, ignorado: 0 };
  linhas.forEach((l) => cont[l.status]++);
  const divergencias = contasVis.map((c) => ({ c, d: F.divergencia(E, c.id) })).filter((x) => x.d && x.d.diferenca !== 0);

  const cards = contasVis.map((c) => {
    const div = F.divergencia(E, c.id);
    return `<div class="conta-card"><span class="muted small">${esc(empresaCurta(c.empresa))}</span><b>${esc(c.nome)}</b><span class="val">${M(F.saldoConta(E, c.id, HOJE()))}</span>
      ${div ? (div.diferenca === 0 ? `<span class="pill ok">Bate com o extrato de ${F.dataBR(div.data)}</span>` : `<span class="pill alerta">Diferença de ${M(Math.abs(div.diferenca))} com o banco</span>`) : `<span class="muted small">Sem extrato importado</span>`}</div>`;
  }).join("");

  const linhaConc = (l) => {
    const c = conta(l.conta);
    const esquerda = `<div><span class="muted small">${F.dataBR(l.data)} · ${esc(c?.nome)}</span><div><b>${esc(l.memo)}</b></div><div class="num ${l.valor > 0 ? "in" : "out"}" style="font-weight:650">${M(l.valor, { sinal: true })}</div></div>`;
    if (l.status === "conciliado") {
      const ts = [...new Set(l.baixas.map((b) => E.baixas.find((x) => x.id === b)?.titulo))].map(titulo).filter(Boolean);
      return `<div class="conc">${esquerda}<div><span class="pill ok">Conciliada</span><div class="small" style="margin-top:6px">${ts.map((t) => `<a href="#" data-abrir="${t.id}">${esc(t.descricao)}</a>`).join(" · ")}</div><div class="acoes"><button class="btn ghost peq" data-desfazer="${l.id}">Desfazer</button></div></div></div>`;
    }
    if (l.status === "ignorado") {
      return `<div class="conc">${esquerda}<div><span class="pill sem">Fora da conciliação</span><div class="small muted" style="margin-top:6px">${esc(l.nota)}</div><div class="acoes"><button class="btn ghost peq" data-desfazer="${l.id}">Reabrir</button></div></div></div>`;
    }
    const sug = F.sugestoes(E, l, HOJE());
    const htmlSug = sug.length ? sug.map((s) => `<div class="sug ${s.exato ? "exata" : ""}"><label style="display:flex;gap:8px;align-items:center;min-width:0"><input type="checkbox" class="check" data-sug="${l.id}" value="${s.titulo.id}" ${s.exato && sug.filter((x) => x.exato).length === 1 ? "checked" : ""}><span style="min-width:0"><b class="small">${esc(s.titulo.descricao)}</b><span class="muted small" style="display:block">vence ${F.dataBR(s.titulo.vencimento)} · saldo ${M(s.saldo)}</span></span></label>${s.exato ? `<span class="pill ok">Valor exato</span>` : ""}</div>`).join("")
      : `<p class="small muted">Nenhum lançamento em aberto parecido. Crie um a partir desta linha.</p>`;
    return `<div class="conc">${esquerda}<div>${htmlSug}<div class="acoes">${sug.length ? `<button class="btn peq" data-conciliar="${l.id}">Conciliar marcados</button>` : ""}<button class="btn sec peq" data-criar-extrato="${l.id}">Criar lançamento</button><button class="btn ghost peq" data-ignorar="${l.id}">Ignorar</button></div></div></div>`;
  };

  return `
    <div class="cabeca"><div><h1>Bancos e conciliação</h1><p>Saldos calculados das baixas e transferências. Importe o OFX do banco e confirme cada linha.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec" data-acao="transferir">Transferir entre contas</button><button class="btn" data-acao="importar-ofx">Importar extrato OFX</button></div></div>
    <div class="contas">${cards}</div>
    <section class="painel">
      <div class="painel-cab"><div><h2>Conciliação</h2><p>Sugestões pelo valor, pela data e pelo nome. Receita e despesa nunca se misturam.</p></div>
        <div class="filtros">${[["pendente", "Pendentes"], ["conciliado", "Conciliadas"], ["ignorado", "Ignoradas"]].map(([v, r]) => `<button class="filtro" data-extrato="${v}" aria-pressed="${ui.extratoFiltro === v}">${r}<b>${cont[v]}</b></button>`).join("")}</div></div>
      ${divergencias.map(({ c, d }) => `<div class="painel-corpo"><div class="aviso alerta">Em ${F.dataBR(d.data)}, o banco informa ${M(d.banco)} em ${esc(c.nome)} e o Vitral calcula ${M(d.sistema)}. A diferença de ${M(Math.abs(d.diferenca))} costuma ser linha do extrato ainda não tratada.</div></div>`).join("")}
      ${!linhas.length ? `<div class="vazio-estado"><h3>Nenhum extrato importado</h3><p>Baixe o arquivo OFX no site do banco e importe aqui. Para testar, use o extrato de exemplo.</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn" data-acao="importar-ofx">Importar OFX</button><button class="btn sec" data-acao="ofx-exemplo">Usar extrato de exemplo</button></div></div>`
        : filtradas.length ? filtradas.map(linhaConc).join("") : `<div class="vazio-estado"><h3>${ui.extratoFiltro === "pendente" ? "Extrato em dia" : "Nada nesta lista"}</h3><p>${ui.extratoFiltro === "pendente" ? "Todas as linhas importadas foram tratadas." : "Troque o filtro acima."}</p></div>`}
    </section>
    <section class="painel">
      <div class="painel-cab"><div><h2>Transferências</h2><p>Movimentam as duas contas e não entram como receita nem despesa.</p></div></div>
      ${E.transferencias.filter((t) => ids.has(t.de) || ids.has(t.para)).length ? `<div class="tabela-wrap"><table><thead><tr><th>Data</th><th>De</th><th>Para</th><th>Descrição</th><th class="valor">Valor</th></tr></thead><tbody>
        ${E.transferencias.filter((t) => ids.has(t.de) || ids.has(t.para)).map((t) => `<tr><td>${F.dataBR(t.data)}</td><td>${esc(conta(t.de)?.nome)}</td><td>${esc(conta(t.para)?.nome)}</td><td>${esc(t.descricao || "—")} ${t.entreEmpresas ? `<span class="chip">Entre empresas</span>` : ""}</td><td class="valor">${M(t.valor)}</td></tr>`).join("")}
      </tbody></table></div>` : `<div class="painel-corpo"><p class="muted small">Nenhuma transferência.</p></div>`}
    </section>`;
}

// ---------------------------------------------------------------- cartões

function cartoes() {
  const ids = new Set(E.cartoes.filter(daEmpresa(ui.empresa)).map((c) => c.id));
  const faturas = E.faturas.filter((f) => ids.has(f.cartao)).sort((a, b) => (a.status === b.status ? b.competencia.localeCompare(a.competencia) : a.status === "aberta" ? -1 : 1));
  const blocoFatura = (f) => {
    const cartao = E.cartoes.find((c) => c.id === f.cartao);
    const compras = E.compras.filter((c) => c.fatura === f.id).sort((a, b) => a.data.localeCompare(b.data));
    const total = compras.reduce((s, c) => s + c.valor, 0);
    const semCat = compras.filter((c) => !c.categoria).length;
    const futuras = F.parcelasFuturas(E, f.id);
    const tituloFatura = f.titulo && titulo(f.titulo);
    return `<section class="painel">
      <div class="painel-cab"><div><h2>${esc(cartao.nome)} · ${F.nomeMes(f.competencia)}</h2><p>Vence em ${F.dataBR(f.vencimento)} · ${compras.length} compras · ${esc(empresaCurta(cartao.empresa))}</p></div>
        <div style="display:flex;gap:10px;align-items:center"><span class="num" style="font:500 24px var(--display)">${M(total)}</span>${f.status === "aberta" ? `<span class="pill alerta">Aberta</span>` : `<span class="pill ok">Fechada</span>`}</div></div>
      <div class="painel-corpo"><div class="aviso neutro">As compras já contam como despesa, cada uma na sua categoria. Ao fechar, nasce uma única conta a pagar da fatura, que só quita o cartão e não soma de novo no resultado.</div></div>
      <div class="tabela-wrap"><table class="compras"><thead><tr><th>Data</th><th>Estabelecimento</th><th>Parcela</th><th>Categoria</th><th class="valor">Valor</th></tr></thead><tbody>
        ${compras.map((c) => `<tr><td class="p-data">${F.dataBR(c.data)}</td><td class="p-loja"><b>${esc(c.loja)}</b></td><td class="p-parc">${c.parcelas > 1 ? `${c.parcela}/${c.parcelas}` : "—"}</td><td class="p-cat">${f.status === "aberta"
          ? `<select class="cat-select ${c.categoria ? "" : "vazio"}" data-cat-compra="${c.id}" aria-label="Categoria de ${esc(c.loja)}"><option value="">Classificar…</option>${E.categorias.filter((x) => x.tipo === "despesa").map((x) => `<option value="${x.id}" ${x.id === c.categoria ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}</select>`
          : esc(cat(c.categoria)?.nome ?? "—")}</td><td class="valor">${M(c.valor)}</td></tr>`).join("")}
      </tbody></table></div>
      <div class="rodape-tabela"><span>${futuras.length ? `Parcelas previstas nas próximas faturas: ${futuras.map((p) => `${esc(p.loja)} ${p.parcela}/${p.parcelas} em ${F.nomeMes(p.competencia)} (${M(p.valor)})`).join(" · ")}` : "Sem parcelas futuras."}</span>
        ${f.status === "aberta" ? `<span style="display:flex;gap:10px;align-items:center">${semCat ? `<span class="pill alerta">${semCat} sem categoria</span>` : ""}<button class="btn peq" data-fechar-fatura="${f.id}" ${semCat ? "disabled" : ""}>Fechar fatura</button></span>`
          : tituloFatura ? `<a href="#" data-abrir="${tituloFatura.id}">Conta a pagar da fatura · ${pillSituacao(F.situacao(E, tituloFatura, HOJE()))}</a>` : ""}</div>
    </section>`;
  };
  return `
    <div class="cabeca"><div><h1>Cartões</h1><p>Importe a fatura, confira as categorias (a loja já vem sugerida) e feche. Parcelas futuras ficam previstas.</p></div><button class="btn" data-acao="importar-fatura">Importar fatura</button></div>
    ${faturas.length ? faturas.map(blocoFatura).join("") : `<section class="painel"><div class="vazio-estado"><h3>Nenhuma fatura</h3><p>Nenhum cartão desta empresa tem fatura importada.</p></div></section>`}`;
}

// ---------------------------------------------------------------- relatórios

function mesesPeriodo() {
  const atual = F.mesDe(HOJE());
  return Array.from({ length: ui.periodo }, (_, i) => F.mesDe(F.somarMeses(`${atual}-01`, i - ui.periodo + 2))).filter((m, i, a) => a.indexOf(m) === i);
}

function relatorios() {
  const meses = mesesPeriodo();
  const d = F.dre(E, { empresa: ui.empresa, meses });
  const pr = F.previstoRealizado(E, { empresa: ui.empresa, meses });
  const soma = (obj) => meses.reduce((s, m) => s + obj[m], 0);
  const grupos = (linhas) => {
    const porGrupo = new Map();
    linhas.forEach((l) => porGrupo.set(l.grupo, [...(porGrupo.get(l.grupo) ?? []), l]));
    const ou = (v) => (v ? M(v) : "—");
    return [...porGrupo.entries()].sort((a, b) => (a[0] === "Sem categoria") - (b[0] === "Sem categoria")).map(([g, ls]) => `<tr class="grupo"><td>${esc(g)}</td>${meses.map((m) => `<td class="valor">${ou(ls.reduce((s, l) => s + l.porMes[m], 0))}</td>`).join("")}<td class="valor">${M(ls.reduce((s, l) => s + soma(l.porMes), 0))}</td></tr>
      ${ls.map((l) => `<tr><td style="padding-left:28px">${esc(l.nome)}</td>${meses.map((m) => `<td class="valor" style="font-weight:400">${l.porMes[m] ? M(l.porMes[m]) : "—"}</td>`).join("")}<td class="valor">${M(soma(l.porMes))}</td></tr>`).join("")}`).join("");
  };
  const maxBar = Math.max(1, ...pr.flatMap((r) => [r.previstoReceita, r.realizadoReceita, r.previstoDespesa, r.realizadoDespesa]));
  const h = (v) => `${Math.round((v / maxBar) * 100)}%`;
  return `
    <div class="cabeca"><div><h1>Relatórios</h1><p>${esc(nomeEmpresaAtual())}. Resultado por competência: a comissão conta no mês do negócio. Transferências e pagamento de fatura ficam de fora.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><div class="segmented" role="group" aria-label="Período">${[[3, "3 meses"], [6, "6 meses"]].map(([v, r]) => `<button data-periodo="${v}" aria-pressed="${ui.periodo === v}">${r}</button>`).join("")}</div><button class="btn sec" data-acao="csv-dre">Exportar CSV</button></div></div>
    <section class="painel">
      <div class="painel-cab"><div><h2>Resultado mensal (DRE)</h2><p>Inclui o mês seguinte já previsto.</p></div></div>
      <div class="tabela-wrap"><table class="dre"><thead><tr><th></th>${meses.map((m) => `<th class="valor">${F.nomeMes(m)}</th>`).join("")}<th class="valor">Total</th></tr></thead><tbody>
        <tr class="total"><td>Receitas</td>${meses.map((m) => `<td class="valor in">${M(d.totalReceitas[m])}</td>`).join("")}<td class="valor in">${M(soma(d.totalReceitas))}</td></tr>
        ${grupos(d.receitas)}
        <tr class="total"><td>Despesas</td>${meses.map((m) => `<td class="valor out">${M(d.totalDespesas[m])}</td>`).join("")}<td class="valor out">${M(soma(d.totalDespesas))}</td></tr>
        ${grupos(d.despesas)}
        <tr class="total"><td>Resultado</td>${meses.map((m) => `<td class="valor ${d.resultado[m] < 0 ? "out" : ""}">${M(d.resultado[m])}</td>`).join("")}<td class="valor">${M(soma(d.resultado))}</td></tr>
      </tbody></table></div>
    </section>
    <section class="painel">
      <div class="painel-cab"><div><h2>Previsto x realizado</h2><p>Previsto pelo vencimento; realizado pelas baixas no mês.</p></div>
        <div class="legenda"><span><i style="background:var(--chart-in);opacity:.3"></i>Receita prevista</span><span><i style="background:var(--chart-in)"></i>Receita realizada</span><span><i style="background:var(--chart-out);opacity:.45"></i>Despesa prevista</span><span><i style="background:var(--rose)"></i>Despesa realizada</span></div></div>
      <div class="painel-corpo"><div class="barras" style="--n:${meses.length}" role="img" aria-label="Previsto e realizado por mês">${pr.map((r) => `<div class="barra-col"><div class="barra-par">
        <span style="height:${h(r.previstoReceita)};background:var(--chart-in);opacity:.3" title="Receita prevista ${esc(F.moeda(r.previstoReceita))}"></span>
        <span style="height:${h(r.realizadoReceita)};background:var(--chart-in)" title="Receita realizada ${esc(F.moeda(r.realizadoReceita))}"></span>
        <span style="height:${h(r.previstoDespesa)};background:var(--chart-out);opacity:.45" title="Despesa prevista ${esc(F.moeda(r.previstoDespesa))}"></span>
        <span style="height:${h(r.realizadoDespesa)};background:var(--rose)" title="Despesa realizada ${esc(F.moeda(r.realizadoDespesa))}"></span>
        </div><small>${F.nomeMes(r.mes)}</small></div>`).join("")}</div></div>
    </section>`;
}

// ---------------------------------------------------------------- configurações

function configuracoes() {
  const porGrupo = new Map();
  E.categorias.forEach((c) => porGrupo.set(`${c.tipo === "receita" ? "Receitas" : "Despesas"} · ${c.grupo}`, [...(porGrupo.get(`${c.tipo === "receita" ? "Receitas" : "Despesas"} · ${c.grupo}`) ?? []), c]));
  return `
    <div class="cabeca"><div><h1>Configurações</h1><p>O que se ajusta de vez em quando fica aqui, fora do caminho do dia a dia.</p></div></div>
    <div class="grade meio">
      <section class="painel"><div class="painel-cab"><div><h2>Categorias</h2><p>Usadas no resultado e nas sugestões.</p></div></div>
        <div class="painel-corpo">${[...porGrupo.entries()].map(([g, cs]) => `<p class="small" style="margin-top:10px"><b>${esc(g)}</b><br><span class="muted">${cs.map((c) => esc(c.nome)).join(" · ")}</span></p>`).join("")}</div></section>
      <section class="painel"><div class="painel-cab"><div><h2>Contas bancárias</h2><p>Cada conta pertence a uma empresa.</p></div></div>
        <div class="tabela-wrap"><table><thead><tr><th>Conta</th><th>Empresa</th><th class="valor">Saldo inicial</th></tr></thead><tbody>${E.contas.map((c) => `<tr><td>${esc(c.nome)}</td><td>${esc(empresaCurta(c.empresa))}</td><td class="valor">${M(c.saldoInicial)}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="painel"><div class="painel-cab"><div><h2>Regras do cartão</h2><p>Quando a loja contém o termo, a categoria vem preenchida.</p></div></div>
        <div class="tabela-wrap"><table><thead><tr><th>Loja contém</th><th>Categoria</th></tr></thead><tbody>${E.regras.map((r) => `<tr><td><b>${esc(r.contem)}</b></td><td>${esc(cat(r.categoria)?.nome)}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="painel"><div class="painel-cab"><div><h2>Permissões por empresa</h2><p>Simulado no laboratório: mostra como ficaria liberar só uma empresa.</p></div><span class="pill alerta">Simulado</span></div>
        <div class="tabela-wrap"><table><thead><tr><th>Pessoa (fictícia)</th><th>Netimóveis</th><th>Sacra Cred</th></tr></thead><tbody>
          ${[["Diretoria", true, true], ["Financeiro Netimóveis", true, false], ["Financeiro Sacra Cred", false, true]].map(([n, a, b]) => `<tr><td>${n}</td><td>${a ? "Acesso total" : "—"}</td><td>${b ? "Acesso total" : "—"}</td></tr>`).join("")}
        </tbody></table></div></section>
    </div>
    <section class="painel" id="historico"><div class="painel-cab"><div><h2>Histórico completo</h2><p>Quem fez, quando e o que mudou. Nada é apagado.</p></div><span class="muted small">${E.auditoria.length} registros</span></div>
      <div class="painel-corpo">${listaHistorico(E.auditoria.slice(0, 80))}</div></section>`;
}

// ---------------------------------------------------------------- gaveta do lançamento

function abrirTitulo(id) {
  const t = titulo(id);
  if (!t) return;
  const s = F.situacao(E, t, HOJE());
  const pago = F.pagoDe(E, id);
  const saldo = F.saldoTitulo(E, t);
  const baixas = E.baixas.filter((b) => b.titulo === id);
  const contasEmp = E.contas.filter((c) => c.empresa === t.empresa);
  const receita = t.tipo === "receita";
  const g = $("#gaveta");
  g.innerHTML = `
    <div class="d-cab"><div><small>${receita ? "Conta a receber" : "Conta a pagar"} · ${esc(F.nomeEmpresa(t.empresa))}</small><h2 id="gaveta-titulo">${esc(t.descricao)}</h2><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${pillSituacao(s)} ${origemChip(t)} ${serieChip(t)}</div></div>
      <button class="icone-btn" data-fechar aria-label="Fechar">${icone("fechar")}</button></div>
    <div class="d-corpo">
      <div class="resumo-titulo">
        <div class="barra-pago" aria-hidden="true"><span style="width:${Math.min(100, Math.round((pago / t.valor) * 100))}%"></span></div>
        <dl>
          <dt>Valor</dt><dd class="num"><b>${M(t.valor)}</b></dd>
          <dt>${receita ? "Recebido" : "Pago"}</dt><dd class="num">${M(pago)}</dd>
          <dt>Saldo em aberto</dt><dd class="num"><b class="${receita ? "in" : "out"}">${M(saldo)}</b></dd>
          <dt>Vencimento</dt><dd>${F.dataBR(t.vencimento)}</dd>
          <dt>Competência</dt><dd>${F.nomeMes(t.competencia)}</dd>
          <dt>${receita ? "Cliente" : "Fornecedor"}</dt><dd>${esc(t.contato || "—")}</dd>
          <dt>Categoria</dt><dd>${t.natureza === "fatura" ? "Quitação do cartão (fora do resultado)" : esc(cat(t.categoria)?.nome ?? "Sem categoria")}</dd>
          <dt>Conta prevista</dt><dd>${esc(conta(t.conta)?.nome ?? "—")}</dd>
        </dl>
      </div>
      ${s !== "cancelado" && saldo > 0 ? `
      <form class="painel" id="form-baixa" style="padding:16px;display:grid;gap:12px">
        <h3>${receita ? "Registrar recebimento" : "Registrar pagamento"}</h3>
        <div class="campos">
          <label class="campo"><span>Valor</span><input name="valor" inputmode="decimal" required value="${esc((saldo / 100).toFixed(2).replace(".", ","))}"><span class="ajuda">Até ${M(saldo)}. Menos que isso fica parcial.</span></label>
          <label class="campo"><span>Data</span><input name="data" type="date" required value="${HOJE()}"></label>
          <label class="campo todo"><span>Conta</span><select name="conta" required>${contasEmp.map((c) => `<option value="${c.id}" ${c.id === t.conta ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></label>
        </div>
        <div><button class="btn" type="submit">${receita ? "Registrar recebimento" : "Registrar pagamento"}</button></div>
      </form>` : ""}
      <section>
        <h3>${receita ? "Recebimentos" : "Pagamentos"}</h3>
        ${baixas.length ? baixas.map((b) => {
          const estornada = F.baixaEstornada(E, b.id);
          return `<div class="baixa-item ${b.estornoDe ? "estorno" : estornada ? "estornada" : ""}"><span>${F.dataBR(b.data)} · ${esc(conta(b.conta)?.nome)}${b.estornoDe ? ` · estorno: ${esc(b.nota)}` : ""}${b.extrato ? " · pelo extrato" : ""}</span><span style="display:flex;gap:6px;align-items:center"><b class="num">${M(b.valor)}</b>
            ${!b.estornoDe && !estornada ? `${receita ? `<button class="btn ghost peq" data-recibo="${b.id}">Recibo</button>` : ""}<button class="btn ghost peq" data-estornar="${b.id}">Estornar</button>` : ""}</span></div>`;
        }).join("") : `<p class="muted small" style="margin-top:6px">Nenhum ainda.</p>`}
      </section>
      <section><h3>Histórico</h3>${listaHistorico(E.auditoria.filter((a) => a.alvo === id))}</section>
    </div>
    <div class="d-rodape">
      ${s === "cancelado" ? `<button class="btn sec" data-reativar="${id}">Reativar</button>` : `${pago === 0 ? `<button class="btn ghost" data-cancelar="${id}">Cancelar lançamento</button>` : ""}<button class="btn sec" data-editar="${id}">Editar</button>`}
      <button class="btn sec" data-duplicar="${id}">Duplicar</button>
    </div>`;
  if (!g.open) g.showModal();
  const form = $("#form-baixa", g);
  form?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const dados = new FormData(form);
    if (agir(() => F.registrarBaixa(E, { titulo: id, valor: F.centavos(dados.get("valor")), data: dados.get("data"), conta: dados.get("conta") }), receita ? "Recebimento registrado." : "Pagamento registrado.")) abrirTitulo(id);
  });
}

// ---------------------------------------------------------------- diálogos

function dialogo(tituloTxt, corpo, rodape, aoEnviar, { largo = false } = {}) {
  const d = $("#dlg");
  d.style.width = largo ? "min(760px, calc(100vw - 24px))" : "";
  d.innerHTML = `<form method="dialog" id="dlg-form" novalidate>
    <div class="d-cab"><div><h2 id="dlg-titulo">${tituloTxt}</h2></div><button type="button" class="icone-btn" data-fechar aria-label="Fechar">${icone("fechar")}</button></div>
    <div class="d-corpo">${corpo}</div>
    <div class="d-rodape"><button type="button" class="btn ghost" data-fechar>Cancelar</button>${rodape}</div></form>`;
  if (!d.open) d.showModal();
  const form = $("#dlg-form", d);
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fechar = aoEnviar(new FormData(form), form, ev.submitter);
    if (fechar) d.close();
  });
  return form;
}

function dialogoLancamento(base = null, editar = false) {
  const t = base ?? { tipo: "despesa", empresa: ui.empresa === "todas" ? "" : ui.empresa, vencimento: HOJE() };
  const contatos = [...new Set(E.titulos.map((x) => x.contato).filter(Boolean))].sort();
  const opcoesCat = (tipo) => `<option value="">Sem categoria por enquanto</option>${E.categorias.filter((c) => c.tipo === tipo).map((c) => `<option value="${c.id}" ${c.id === t.categoria ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}`;
  const form = dialogo(editar ? "Editar lançamento" : "Novo lançamento", `
    ${editar ? "" : `<div class="tipo-escolha" role="radiogroup" aria-label="Tipo"><label><input type="radio" name="tipo" value="despesa" ${t.tipo === "despesa" ? "checked" : ""}>A pagar</label><label><input type="radio" name="tipo" value="receita" ${t.tipo === "receita" ? "checked" : ""}>A receber</label></div>`}
    <div class="campos">
      <label class="campo"><span>Valor</span><input name="valor" inputmode="decimal" required placeholder="0,00" value="${t.valor ? esc((t.valor / 100).toFixed(2).replace(".", ",")) : ""}"></label>
      <label class="campo"><span>Vencimento</span><input name="vencimento" type="date" required value="${esc(t.vencimento)}"></label>
      <label class="campo todo"><span>Descrição</span><input name="descricao" required placeholder="Ex.: Portal de anúncios · plano mensal" value="${esc(t.descricao ?? "")}"></label>
      <fieldset class="campo todo" style="border:0;padding:0;margin:0"><span style="font-size:12px;font-weight:600">Empresa</span>
        <div class="tipo-escolha">${F.EMPRESAS.map((e) => `<label><input type="radio" name="empresa" value="${e.id}" ${t.empresa === e.id ? "checked" : ""} required>${esc(e.nome)}</label>`).join("")}</div></fieldset>
      <label class="campo"><span>${t.tipo === "receita" ? "Cliente" : "Fornecedor"} <span class="ajuda">opcional</span></span><input name="contato" list="lista-contatos" value="${esc(t.contato ?? "")}" autocomplete="off"><datalist id="lista-contatos">${contatos.map((c) => `<option value="${esc(c)}">`).join("")}</datalist></label>
      <label class="campo"><span>Categoria</span><select name="categoria" id="campo-cat">${opcoesCat(t.tipo)}</select><span class="ajuda" id="dica-cat"></span></label>
    </div>
    <details class="mais"><summary>Mais detalhes</summary><div class="campos">
      <label class="campo"><span>Competência <span class="ajuda">mês do resultado</span></span><input name="competencia" type="month" value="${esc(t.competencia ?? F.mesDe(t.vencimento))}"></label>
      <label class="campo"><span>Conta prevista</span><select name="conta" id="campo-conta"><option value="">Escolher na baixa</option></select></label>
      ${editar ? "" : `<label class="campo"><span>Repete</span><select name="repete"><option value="">Não repete</option><option value="1">Todo mês</option><option value="3">A cada 3 meses</option><option value="12">Todo ano</option></select></label>
      <label class="campo"><span>Quantas vezes</span><input name="vezes" type="number" min="2" max="60" value="12"></label>`}
    </div></details>
    <div id="aviso-dup"></div>`,
    `<button class="btn" type="submit" id="btn-salvar">${editar ? "Salvar alterações" : "Salvar lançamento"}</button>`,
    (dados, formEl, botao) => {
      const tipo = editar ? t.tipo : dados.get("tipo");
      const novo = {
        tipo, descricao: String(dados.get("descricao") ?? ""), valor: F.centavos(dados.get("valor")), vencimento: dados.get("vencimento"),
        empresa: dados.get("empresa") ?? "", contato: String(dados.get("contato") ?? ""), categoria: dados.get("categoria") ?? "",
        competencia: dados.get("competencia") ? `${dados.get("competencia")}-01` : "", conta: dados.get("conta") ?? "",
      };
      if (!Number.isFinite(novo.valor)) { toast("Informe um valor válido, como 1.250,00.", true); return false; }
      if (editar) {
        const mudancas = { ...novo, competencia: novo.competencia ? F.mesDe(novo.competencia) : t.competencia };
        delete mudancas.tipo;
        const ok = agir(() => F.editarTitulo(E, t.id, mudancas), "Alterações salvas.");
        if (ok) abrirTitulo(t.id);
        return ok;
      }
      const dup = F.possiveisDuplicados(E, novo);
      if (dup.length && botao?.dataset.confirmado !== "1") {
        $("#aviso-dup", formEl).innerHTML = `<div class="aviso alerta">Parece repetido: já existe "${esc(dup[0].descricao)}" de ${M(dup[0].valor)} vencendo em ${F.dataBR(dup[0].vencimento)}. Confira antes de salvar.</div>`;
        botao.textContent = "Salvar mesmo assim";
        botao.dataset.confirmado = "1";
        return false;
      }
      if (dados.get("repete")) novo.repete = { meses: Number(dados.get("repete")), vezes: Number(dados.get("vezes")) || 1 };
      return agir(() => F.criarTitulo(E, novo), (r) => (r.ids.length > 1 ? `${r.ids.length} lançamentos criados.` : "Lançamento criado."));
    });
  const atualizarContas = () => {
    const emp = form.querySelector("input[name=empresa]:checked")?.value;
    const sel = $("#campo-conta", form);
    sel.innerHTML = `<option value="">Escolher na baixa</option>${E.contas.filter((c) => c.empresa === emp).map((c) => `<option value="${c.id}" ${c.id === t.conta ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}`;
  };
  atualizarContas();
  form.addEventListener("change", (ev) => {
    if (ev.target.name === "tipo") $("#campo-cat", form).innerHTML = opcoesCat(ev.target.value);
    if (ev.target.name === "empresa") atualizarContas();
    if (ev.target.name === "contato" && !$("#campo-cat", form).value) {
      const anterior = E.titulos.find((x) => x.contato === ev.target.value && x.categoria);
      if (anterior) { $("#campo-cat", form).value = anterior.categoria; $("#dica-cat", form).textContent = "Sugerida pelo último lançamento deste contato."; }
    }
  });
  setTimeout(() => form.querySelector("input[name=valor]").focus(), 30);
}

function dialogoMotivo(tituloTxt, rotulo, botao, aoConfirmar, perigo = false) {
  dialogo(tituloTxt, `<label class="campo"><span>${rotulo}</span><textarea name="motivo" required placeholder="Fica registrado no histórico"></textarea></label>`,
    `<button class="btn ${perigo ? "perigo" : ""}" type="submit">${botao}</button>`, (dados) => aoConfirmar(String(dados.get("motivo") ?? "")));
}

function dialogoLote() {
  const lista = [...ui.sel].map(titulo).filter(Boolean);
  const total = lista.reduce((s, t) => s + F.saldoTitulo(E, t), 0);
  const empresas = [...new Set(lista.map((t) => t.empresa))];
  dialogo("Quitar selecionados", `
    <p>${lista.length} lançamento${lista.length > 1 ? "s" : ""}, saldo somado de <b>${M(total)}</b>. Cada um recebe a baixa do próprio saldo em aberto.</p>
    <div class="campos"><label class="campo"><span>Data</span><input type="date" name="data" value="${HOJE()}" required></label>
    <label class="campo"><span>Conta</span><select name="conta"><option value="">A conta prevista de cada um</option>${E.contas.filter((c) => empresas.includes(c.empresa)).map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join("")}</select><span class="ajuda">Só vale para lançamentos da mesma empresa da conta.</span></label></div>`,
    `<button class="btn" type="submit">Quitar ${M(total)}</button>`,
    (dados) => {
      const ok = agir(() => F.quitarLote(E, { ids: [...ui.sel], data: dados.get("data"), conta: dados.get("conta") }), (r) => `${r.feitos.length} quitado${r.feitos.length > 1 ? "s" : ""}${r.pulados.length ? ` · ${r.pulados.length} já estava${r.pulados.length > 1 ? "m" : ""} sem saldo` : ""}.`);
      if (ok) { ui.sel.clear(); render(); }
      return ok;
    });
}

function dialogoTransferencia() {
  const opcoes = E.contas.map((c) => `<option value="${c.id}">${esc(c.nome)} · ${esc(empresaCurta(c.empresa))}</option>`).join("");
  dialogo("Transferir entre contas", `
    <div class="campos"><label class="campo"><span>De</span><select name="de" required>${opcoes}</select></label><label class="campo"><span>Para</span><select name="para" required>${opcoes}</select></label>
    <label class="campo"><span>Valor</span><input name="valor" inputmode="decimal" required placeholder="0,00"></label><label class="campo"><span>Data</span><input type="date" name="data" value="${HOJE()}" required></label>
    <label class="campo todo"><span>Descrição <span class="ajuda">opcional</span></span><input name="descricao" placeholder="Ex.: reforço de caixa"></label></div>
    <div class="aviso neutro">Não entra como receita nem despesa. Entre empresas diferentes, fica marcada como transferência entre empresas.</div>`,
    `<button class="btn" type="submit">Transferir</button>`,
    (dados) => agir(() => F.transferir(E, { de: dados.get("de"), para: dados.get("para"), valor: F.centavos(dados.get("valor")), data: dados.get("data"), descricao: String(dados.get("descricao") ?? "") }), "Transferência registrada."));
  $("#dlg select[name=para]").selectedIndex = 1;
}

function dialogoOFX(textoInicial = "") {
  let lido = null;
  const form = dialogo("Importar extrato OFX", `
    <label class="campo"><span>Conta</span><select name="conta">${E.contas.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join("")}</select></label>
    <label class="campo"><span>Arquivo OFX</span><input type="file" name="arquivo" accept=".ofx,.OFX,application/x-ofx,text/plain"><span class="ajuda">Baixe no site do banco, na área de extrato, no formato OFX ou Money.</span></label>
    <button type="button" class="btn sec peq" data-exemplo-ofx style="justify-self:start">Usar extrato de exemplo</button>
    <div id="previa-ofx"></div>`,
    `<button class="btn" type="submit" id="btn-importar" disabled>Importar</button>`,
    (dados) => {
      if (!lido) return false;
      const ok = agir(() => F.importarExtrato(E, dados.get("conta"), lido), "Extrato importado. Confira as sugestões.");
      if (ok) { ui.area = "bancos"; ui.extratoFiltro = "pendente"; render(); }
      return ok;
    });
  const mostrar = (texto) => {
    const alvo = $("#previa-ofx", form);
    try {
      lido = F.lerOFX(texto);
      const contaId = form.querySelector("[name=conta]").value;
      const { novas, duplicadas } = F.previaExtrato(E, contaId, lido);
      alvo.innerHTML = `<div class="aviso ${novas.length ? "" : "alerta"}"><div><b>Prévia antes de gravar</b><br>Conta no arquivo: ${esc(lido.conta || "—")} · período ${F.dataBR(lido.inicio)} a ${F.dataBR(lido.fim)}<br>${novas.length} linha(s) nova(s)${duplicadas.length ? ` · ${duplicadas.length} já importada(s), serão ignoradas` : ""}${lido.saldo ? `<br>Saldo informado pelo banco: ${M(lido.saldo.valor)} em ${F.dataBR(lido.saldo.data)}` : ""}</div></div>`;
      $("#btn-importar", form).disabled = !novas.length;
    } catch (e) {
      lido = null;
      alvo.innerHTML = `<div class="aviso perigo">${esc(e.message)}</div>`;
      $("#btn-importar", form).disabled = true;
    }
  };
  form.querySelector("[name=arquivo]").addEventListener("change", async (ev) => { const f = ev.target.files?.[0]; if (f) mostrar(await f.text()); });
  form.querySelector("[data-exemplo-ofx]").addEventListener("click", () => { form.querySelector("[name=conta]").value = "k-net-1"; mostrar(ofxExemplo(E)); });
  form.querySelector("[name=conta]").addEventListener("change", () => lido && mostrar(ofxExemplo(E)));
  if (textoInicial) { form.querySelector("[name=conta]").value = "k-net-1"; mostrar(textoInicial); }
}

function dialogoFatura() {
  let compras = [];
  const proximo = F.mesDe(F.somarMeses(`${F.mesDe(HOJE())}-01`, 1));
  const form = dialogo("Importar fatura do cartão", `
    <div class="campos"><label class="campo"><span>Cartão</span><select name="cartao">${E.cartoes.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join("")}</select></label>
    <label class="campo"><span>Mês da fatura</span><input type="month" name="competencia" value="${proximo}" required></label>
    <label class="campo"><span>Vencimento</span><input type="date" name="vencimento" value="${F.somarDias(`${proximo}-01`, 34).slice(0, 8)}05" required></label>
    <label class="campo"><span>Arquivo CSV <span class="ajuda">opcional</span></span><input type="file" name="arquivo" accept=".csv,text/csv,text/plain"></label>
    <label class="campo todo"><span>Ou cole as linhas</span><textarea name="texto" rows="5" placeholder="data;estabelecimento;valor;parcela"></textarea><span class="ajuda">Uma compra por linha: data; estabelecimento; valor; parcela (ex.: 2/3).</span></label></div>
    <button type="button" class="btn sec peq" data-exemplo-fatura style="justify-self:start">Usar fatura de exemplo</button>
    <div id="previa-fatura"></div>`,
    `<button class="btn" type="submit" id="btn-fatura" disabled>Importar</button>`,
    (dados) => {
      const ok = agir(() => F.importarFatura(E, { cartao: dados.get("cartao"), competencia: dados.get("competencia"), vencimento: dados.get("vencimento"), compras }), "Fatura importada. Revise as categorias.");
      if (ok) { ui.area = "cartoes"; render(); }
      return ok;
    }, { largo: true });
  const mostrar = () => {
    const r = F.lerFaturaCSV(form.querySelector("[name=texto]").value);
    compras = r.compras;
    $("#previa-fatura", form).innerHTML = r.compras.length || r.erros.length ? `<div class="aviso ${r.erros.length ? "alerta" : ""}"><div><b>Prévia</b> · ${r.compras.length} compra(s), total ${M(r.compras.reduce((s, c) => s + c.valor, 0))}${r.compras.filter((c) => c.parcelas > 1).length ? ` · ${r.compras.filter((c) => c.parcelas > 1).length} parcelada(s)` : ""}${r.erros.length ? `<br>${r.erros.map(esc).join("<br>")}` : ""}</div></div>` : "";
    $("#btn-fatura", form).disabled = !r.compras.length;
  };
  form.querySelector("[name=texto]").addEventListener("input", mostrar);
  form.querySelector("[name=arquivo]").addEventListener("change", async (ev) => { const f = ev.target.files?.[0]; if (f) { form.querySelector("[name=texto]").value = await f.text(); mostrar(); } });
  form.querySelector("[data-exemplo-fatura]").addEventListener("click", () => { form.querySelector("[name=texto]").value = faturaExemplo(E); mostrar(); });
}

function dialogoCriarDoExtrato(linhaId) {
  const l = E.extrato.find((x) => x.id === linhaId);
  const tipo = l.valor > 0 ? "receita" : "despesa";
  dialogo("Criar lançamento a partir do extrato", `
    <p>${F.dataBR(l.data)} · <b>${esc(l.memo)}</b> · <span class="${tipo === "receita" ? "in" : "out"}">${M(l.valor, { sinal: true })}</span></p>
    <div class="campos"><label class="campo todo"><span>Descrição</span><input name="descricao" value="${esc(l.memo)}" required></label>
    <label class="campo"><span>Categoria</span><select name="categoria"><option value="">Sem categoria</option>${E.categorias.filter((c) => c.tipo === tipo).map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join("")}</select></label>
    <label class="campo"><span>${tipo === "receita" ? "Cliente" : "Fornecedor"}</span><input name="contato"></label></div>
    <div class="aviso neutro">O lançamento nasce já quitado nesta data e ligado a esta linha do extrato.</div>`,
    `<button class="btn" type="submit">Criar e conciliar</button>`,
    (dados) => agir(() => F.criarDoExtrato(E, { linha: linhaId, descricao: String(dados.get("descricao")), categoria: dados.get("categoria"), contato: String(dados.get("contato") ?? "") }), "Lançamento criado e conciliado."));
}

function dialogoRecibo(baixaId) {
  const b = E.baixas.find((x) => x.id === baixaId);
  const t = titulo(b.titulo);
  dialogo("Recibo", `<div class="recibo"><h3>Recibo</h3>
    <p>Recebemos de <b>${esc(t.contato || "—")}</b> a quantia de <b>${M(b.valor)}</b>, referente a ${esc(t.descricao)}, em ${F.dataBR(b.data)}.</p>
    <p>${esc(F.nomeEmpresa(t.empresa))} · ${esc(conta(b.conta)?.nome)}</p><p class="muted small">Modelo do laboratório, com dados fictícios. Na versão integrada, sai em PDF com o papel timbrado.</p></div>`,
    `<button class="btn" type="button" data-fechar>Fechar</button>`, () => true);
}

// ---------------------------------------------------------------- render e eventos

function render() {
  document.body.dataset.tema = ui.tema;
  document.querySelectorAll(".labbar [data-tema]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tema === ui.tema)));
  renderMenu();
  renderTopo();
  const telas = { painel, contas, bancos, cartoes, relatorios, config: configuracoes };
  $("#principal").innerHTML = (telas[ui.area] ?? painel)();
  const g = $("#gaveta");
  if (g.open && g.dataset.titulo) abrirTitulo(g.dataset.titulo);
}

function ir(area, extras = {}) {
  ui.area = area;
  if (extras.filtro) ui.filtro = extras.filtro;
  if (area !== "contas") ui.sel.clear();
  history.replaceState(null, "", `#${area}`);
  fecharMenu();
  render();
  $("#principal").focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
  if (extras.secao) setTimeout(() => document.getElementById(extras.secao)?.scrollIntoView({ behavior: "smooth" }), 50);
}

function fecharMenu() { $("#menu").classList.remove("aberta"); document.querySelector(".fundo-menu")?.remove(); }

document.addEventListener("click", (ev) => {
  const alvo = ev.target.closest("button, a, tr[data-abrir], input");
  if (!alvo) return;
  const d = alvo.dataset;
  if (alvo.closest("[data-fechar]") || d.fechar !== undefined) { alvo.closest("dialog")?.close(); return; }
  if (d.ir) { ev.preventDefault(); ir(d.ir, { filtro: d.filtro, secao: d.secao }); return; }
  if (d.tema) { ui.tema = d.tema; try { localStorage.setItem(`${CHAVE}-tema`, ui.tema); } catch { /* sem armazenamento */ } render(); return; }
  if (d.empresa) { ui.empresa = d.empresa; ui.sel.clear(); render(); return; }
  if (d.tipo) { ui.tipo = d.tipo; render(); return; }
  if (d.filtro) { ui.filtro = d.filtro; render(); return; }
  if (d.extrato) { ui.extratoFiltro = d.extrato; render(); return; }
  if (d.periodo) { ui.periodo = Number(d.periodo); render(); return; }
  if (d.sel) { ev.stopPropagation(); alvo.checked ? ui.sel.add(d.sel) : ui.sel.delete(d.sel); render(); return; }
  if (alvo.matches("input, select")) { if (alvo.closest("tr[data-abrir]")) ev.stopPropagation(); if (d.acao !== "sel-todos") return; }
  if (d.abrir) { ev.preventDefault(); $("#gaveta").dataset.titulo = d.abrir; abrirTitulo(d.abrir); return; }
  if (d.estornar) { dialogoMotivo("Estornar baixa", "Motivo do estorno", "Estornar", (motivo) => agir(() => F.estornarBaixa(E, { baixa: d.estornar, motivo }), "Estorno registrado. A baixa original continua no histórico."), true); return; }
  if (d.recibo) { dialogoRecibo(d.recibo); return; }
  if (d.cancelar) { dialogoMotivo("Cancelar lançamento", "Motivo do cancelamento", "Cancelar lançamento", (motivo) => agir(() => F.cancelarTitulo(E, { id: d.cancelar, motivo }), "Lançamento cancelado."), true); return; }
  if (d.reativar) { agir(() => F.reativarTitulo(E, d.reativar), "Lançamento reativado."); return; }
  if (d.editar) { dialogoLancamento(titulo(d.editar), true); return; }
  if (d.duplicar) { const t = titulo(d.duplicar); $("#gaveta").close(); dialogoLancamento({ ...t, vencimento: F.somarMeses(t.vencimento, 1), competencia: undefined }); return; }
  if (d.conciliar) {
    const ids = [...document.querySelectorAll(`[data-sug="${d.conciliar}"]:checked`)].map((i) => i.value);
    agir(() => F.conciliar(E, { linha: d.conciliar, titulos: ids }), "Linha conciliada: baixa registrada com a data do extrato.");
    return;
  }
  if (d.criarExtrato) { dialogoCriarDoExtrato(d.criarExtrato); return; }
  if (d.ignorar) { dialogoMotivo("Deixar linha fora da conciliação", "Por quê?", "Ignorar linha", (motivo) => agir(() => F.ignorarLinha(E, { linha: d.ignorar, motivo }), "Linha marcada como ignorada.")); return; }
  if (d.desfazer) { agir(() => F.desfazerConciliacao(E, d.desfazer), "Desfeito. As baixas foram estornadas com registro."); return; }
  if (d.fecharFatura) { agir(() => F.fecharFatura(E, d.fecharFatura), "Fatura fechada: uma conta a pagar foi criada."); return; }
  switch (d.acao) {
    case "novo": dialogoLancamento(); break;
    case "menu": $("#menu").classList.add("aberta"); document.body.insertAdjacentHTML("beforeend", '<div class="fundo-menu"></div>'); document.querySelector(".fundo-menu").addEventListener("click", fecharMenu); break;
    case "lote": dialogoLote(); break;
    case "limpar-sel": ui.sel.clear(); render(); break;
    case "sel-todos": {
      const comSaldo = titulosVisiveis().filter((t) => t.status !== "cancelado" && F.saldoTitulo(E, t) > 0);
      if (alvo.checked) comSaldo.forEach((t) => ui.sel.add(t.id)); else ui.sel.clear();
      render(); break;
    }
    case "transferir": dialogoTransferencia(); break;
    case "importar-ofx": dialogoOFX(); break;
    case "ofx-exemplo": dialogoOFX(ofxExemplo(E)); break;
    case "importar-fatura": dialogoFatura(); break;
    case "restaurar":
      dialogo("Restaurar a demonstração", "<p>Os dados fictícios voltam ao estado inicial neste navegador. O que você testou aqui será apagado.</p>", `<button class="btn perigo" type="submit">Restaurar</button>`,
        () => { E = gerarDemo(hojeLocal()); salvar(); ui.sel.clear(); $("#gaveta").close(); render(); toast("Demonstração restaurada."); return true; });
      break;
    case "csv-titulos": baixar("contas-vitral-laboratorio.csv", F.exportarCSV([["Tipo", "Descrição", "Contato", "Empresa", "Categoria", "Vencimento", "Valor", "Pago", "Saldo", "Situação"],
      ...titulosVisiveis().map((t) => [t.tipo, t.descricao, t.contato, F.nomeEmpresa(t.empresa), cat(t.categoria)?.nome ?? "", F.dataBR(t.vencimento), (t.valor / 100).toFixed(2).replace(".", ","), (F.pagoDe(E, t.id) / 100).toFixed(2).replace(".", ","), (F.saldoTitulo(E, t) / 100).toFixed(2).replace(".", ","), F.situacao(E, t, HOJE())])])); break;
    case "csv-dre": {
      const meses = mesesPeriodo();
      const r = F.dre(E, { empresa: ui.empresa, meses });
      const v = (c) => (c / 100).toFixed(2).replace(".", ",");
      baixar("dre-vitral-laboratorio.csv", F.exportarCSV([["Linha", ...meses.map(F.nomeMes)], ["Receitas", ...meses.map((m) => v(r.totalReceitas[m]))], ...r.receitas.map((l) => [`  ${l.nome}`, ...meses.map((m) => v(l.porMes[m]))]),
        ["Despesas", ...meses.map((m) => v(r.totalDespesas[m]))], ...r.despesas.map((l) => [`  ${l.nome}`, ...meses.map((m) => v(l.porMes[m]))]), ["Resultado", ...meses.map((m) => v(r.resultado[m]))]]));
      break;
    }
    default: break;
  }
});

document.addEventListener("change", (ev) => {
  const el = ev.target;
  if (el.dataset.categorizar) {
    agir(() => F.editarTitulo(E, el.dataset.categorizar, { categoria: el.value }), el.value ? `Classificado como ${cat(el.value)?.nome}.` : "Categoria removida.");
  }
  if (el.dataset.catCompra) {
    const compra = E.compras.find((c) => c.id === el.dataset.catCompra);
    agir(() => F.categorizarCompra(E, { compra: el.dataset.catCompra, categoria: el.value, lembrar: Boolean(el.value) }), el.value ? `Classificado. Próximas compras em ${compra.loja.split(/\s+/)[0]} virão com esta categoria.` : "Categoria removida.");
  }
});

document.addEventListener("input", (ev) => {
  if (ev.target.id !== "busca") return;
  ui.busca = ev.target.value;
  if (ui.area !== "contas") { ui.area = "contas"; ui.filtro = "todos"; }
  const pos = ev.target.selectionStart;
  render();
  const campo = $("#busca");
  campo.focus();
  campo.setSelectionRange(pos, pos);
});

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") fecharMenu();
  if (ev.key === "n" && !ev.target.closest("input, textarea, select, dialog") && !ev.metaKey && !ev.ctrlKey) { ev.preventDefault(); dialogoLancamento(); }
  if (ev.key === "Enter" && ev.target.matches("tr[data-abrir]")) abrirTitulo(ev.target.dataset.abrir);
});
$("#gaveta").addEventListener("close", () => delete $("#gaveta").dataset.titulo);

function baixar(nome, conteudo) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Arquivo CSV gerado.");
}

window.addEventListener("hashchange", () => { const a = location.hash.replace("#", ""); if (a && a !== ui.area) { ui.area = a; render(); } });
render();
