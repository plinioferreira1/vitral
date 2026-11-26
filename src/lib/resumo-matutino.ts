import { botaoEmailSacra, escaparHtmlEmail, layoutEmailSacra } from "@/lib/email-layout-sacra";
import type { ResumoProcessos } from "@/lib/resumo-processos";

export type ItemFinanceiroMatutino = { id: string; descricao: string; vencimento: string; tipo: "receita" | "despesa"; valor: number };
export type ItemDemandaMatutina = { id: string; titulo: string; prazo: string | null; prioridade: string };
export type ItemVendaMatutina = { processo_id: string; titulo: string; mensagem: string };
export type ResumoMatutino = {
  dia: string; nome: string;
  financeiro: { saldo: number | null; pagarHoje: ItemFinanceiroMatutino[]; receberHoje: ItemFinanceiroMatutino[]; vencidos: ItemFinanceiroMatutino[] };
  demandas: { hoje: ItemDemandaMatutina[]; vencidas: ItemDemandaMatutina[]; outras: ItemDemandaMatutina[] };
  processos: ResumoProcessos;
  vendas: ItemVendaMatutina[];
};

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://vitral.sacraimoveis.com.br").replace(/\/$/, "");
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (iso: string) => iso.split("-").reverse().join("/");
const esc = (s: unknown) => escaparHtmlEmail(s);
const link = (url: string, titulo: string) =>
  `<a style="font-weight:600;color:#731515;text-decoration:none" href="${esc(url)}">${esc(titulo)}</a>`;
const section = (titulo: string, texto: string, corpo: string) =>
  `<section style="margin-top:18px;border:1px solid #e8e2db;background:#fff;border-radius:12px;padding:18px">
    <h2 style="margin:0;color:#731515;font-size:17px">${esc(titulo)}</h2>
    <p style="margin:5px 0 12px;color:#746d68;font-size:13px">${esc(texto)}</p>
    ${corpo}
  </section>`;
const lista = <T,>(itens: T[], linha: (item: T) => string, vazio: string) =>
  itens.length ? `<ul style="margin:0;padding-left:19px">${itens.slice(0, 8).map(linha).join("")}</ul>${itens.length > 8 ? `<p>+ ${itens.length - 8} outros itens no VITRAL.</p>` : ""}`
    : `<p style="color:#746d68;margin:0;font-size:13px">${esc(vazio)}</p>`;
const item = (conteudo: string) => `<li style="margin-bottom:9px;line-height:20px">${conteudo}</li>`;

export function montarHtmlResumoMatutino(r: ResumoMatutino): string {
  const f = r.financeiro, d = r.demandas, p = r.processos;
  const soma = (itens: ItemFinanceiroMatutino[]) => itens.reduce((total, i) => total + i.valor, 0);
  const pagamentosVencidos = f.vencidos.filter(i => i.tipo === "despesa");
  const recebimentosVencidos = f.vencidos.filter(i => i.tipo === "receita");
  const linhaFinanceiro = (i: ItemFinanceiroMatutino) =>
    item(`${link(SITE + "/financeiro/lancamentos", i.descricao)} · ${dataBR(i.vencimento)} · <strong>${brl(i.valor)}</strong>`);
  const linhaDemanda = (i: ItemDemandaMatutina) =>
    item(`${link(SITE + "/demandas/" + encodeURIComponent(i.id), i.titulo)} · ${i.prazo ? dataBR(i.prazo) : "sem prazo"} · ${esc(i.prioridade)}`);
  const linhaProcesso = (i: { processoId: string; imovel: string; etapa?: string; data: string }) =>
    item(`${link(SITE + "/processos/" + encodeURIComponent(i.processoId), i.imovel)} · ${i.etapa ? esc(i.etapa) + " · " : ""}${dataBR(i.data)}`);
  const linhaVenda = (i: ItemVendaMatutina) =>
    item(`${link(SITE + "/processos/" + encodeURIComponent(i.processo_id), i.titulo)}<div style="color:#746d68">${esc(i.mensagem)}</div>`);

  const financeiro = section("Financeiro", "Contas e pagamentos que precisam de atenção",
    `<p><strong>Saldo consolidado:</strong> ${f.saldo === null ? "Não disponível" : brl(f.saldo)}</p>
    <p style="color:#a52828"><strong>A pagar hoje:</strong> ${f.pagarHoje.length} · ${brl(soma(f.pagarHoje))}</p>
    ${lista(f.pagarHoje, linhaFinanceiro, "Nenhum pagamento vence hoje.")}
    <p><strong>A receber hoje:</strong> ${f.receberHoje.length} · ${brl(soma(f.receberHoje))}</p>
    ${lista(f.receberHoje, linhaFinanceiro, "Nenhum recebimento vence hoje.")}
    <p style="color:#a52828"><strong>Despesas vencidas:</strong> ${pagamentosVencidos.length} · ${brl(soma(pagamentosVencidos))}</p>
    ${lista(pagamentosVencidos, linhaFinanceiro, "Nenhuma despesa vencida.")}
    <p><strong>Recebimentos vencidos:</strong> ${recebimentosVencidos.length} · ${brl(soma(recebimentosVencidos))}</p>
    ${lista(recebimentosVencidos, linhaFinanceiro, "Nenhum recebimento vencido.")}`);

  const demandas = section("Minhas demandas", `${d.hoje.length} para hoje · ${d.vencidas.length} vencidas · ${d.outras.length} outras pendentes`,
    `<p><strong>Vencidas</strong></p>${lista(d.vencidas, linhaDemanda, "Nenhuma demanda vencida.")}
    <p><strong>Vencem hoje</strong></p>${lista(d.hoje, linhaDemanda, "Nenhuma demanda vence hoje.")}
    <p><strong>Outras pendentes</strong></p>${lista(d.outras, linhaDemanda, "Nenhuma outra demanda em aberto.")}`);

  const processos = section("Processos e prazos", `${p.processosEmAndamento} em andamento · ${p.atrasadas.length} etapas atrasadas · ${p.hoje.length} para hoje`,
    `<p><strong>Etapas atrasadas</strong></p>${lista(p.atrasadas, linhaProcesso, "Nenhuma etapa atrasada.")}
    <p><strong>Vencem hoje</strong></p>${lista(p.hoje, linhaProcesso, "Nenhuma etapa prevista hoje.")}
    <p><strong>Próximos 7 dias</strong></p>${lista(p.proximos, linhaProcesso, "Nenhuma etapa próxima.")}
    <p><strong>Contratos a vencer nos próximos 30 dias</strong></p>${lista(p.prazosContrato, linhaProcesso, "Nenhum prazo próximo.")}`);

  const vendas = section("Lembretes de vendas", `${r.vendas.length} aviso(s) registrado(s) hoje`,
    lista(r.vendas, linhaVenda, "Nenhum lembrete de venda registrado hoje."));

  return layoutEmailSacra("Resumo unificado", "Seu dia no VITRAL",
    `<p>Bom dia, <strong>${esc(r.nome.split(/\s+/)[0] || "colaborador")}</strong>! Esta é a prévia de seu resumo de ${dataBR(r.dia)}.</p>
     <p style="background:#fff7ed;border:1px solid #fed7aa;padding:12px;border-radius:10px;font-size:12px">Versão de teste — os e-mails atuais permanecem ativos até a homologação.</p>
     ${financeiro}${demandas}${processos}${vendas}
     <p style="margin-top:18px">${botaoEmailSacra("Abrir VITRAL", SITE)}</p>
     <p style="color:#746d68;font-size:12px">Demandas e lembretes são individuais; informações de gestão só aparecem para usuários com permissão. Notificações urgentes seguem independentes.</p>`,
    dataBR(r.dia) + " · Sacra Netimóveis");
}
