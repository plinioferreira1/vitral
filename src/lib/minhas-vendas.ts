export type EtapaVenda = { id: string; nome: string; status: string; prevista: string | null; realizada: string | null; ordem: number };
export type ComissaoCorretor = { id: string; status: string; valor_previsto: number | null; valor_recebido: number | null; data_prevista: string | null; data_recebida: string | null };
export type VendaCorretor = {
 id: string; numero: string; status: string; imovel: string | null; comprador: string | null; vendedor: string | null; responsavel: string | null;
 prazo_contrato: string | null; assinatura_contrato: string | null; comissoes?: ComissaoCorretor[]; etapas: EtapaVenda[];
 atualizacoes: { id: string; mensagem: string; criado_em: string; autor: string | null }[];
};
export type MinhasVendas = { vinculado: boolean; vendas: VendaCorretor[] };
export const STATUS_VENDA: Record<string, string> = { ativo: "Em andamento", pendente: "Pendente", concluido: "Concluída", cancelado: "Cancelada", arquivado: "Arquivada" };
export const STATUS_ETAPA: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", bloqueada: "Bloqueada" };
export function situacaoEtapaVenda(etapa: EtapaVenda, hoje: string, vendaAtiva = true) {
 const atrasada = vendaAtiva && etapa.status !== "concluida" && !!etapa.prevista && etapa.prevista < hoje;
 const cores: Record<string, string> = {
  concluida: "border-emerald-200 bg-emerald-50 text-emerald-800",
  pendente: "border-amber-200 bg-amber-50 text-amber-800",
  em_andamento: "border-sky-200 bg-sky-50 text-sky-800",
  bloqueada: "border-violet-200 bg-violet-50 text-violet-800",
 };
 return {
  texto: atrasada ? `${STATUS_ETAPA[etapa.status] ?? etapa.status} · Atrasada` : STATUS_ETAPA[etapa.status] ?? etapa.status,
  classe: atrasada ? "border-rose-200 bg-rose-50 text-rose-800" : cores[etapa.status] ?? "border-slate-200 bg-slate-50 text-slate-700",
  atrasada,
 };
}
export function andamento(v: VendaCorretor) { return !["concluido", "cancelado", "arquivado"].includes(v.status); }
export function resumoVenda(v: VendaCorretor, hoje: string) {
 const abertas = v.etapas.filter((e) => e.status !== "concluida");
 const proximo = [...abertas].filter((e) => e.prevista).sort((a,b) => a.prevista!.localeCompare(b.prevista!))[0] ?? null;
 return { atual: abertas.find((e) => e.status === "em_andamento") ?? abertas[0] ?? null, proximo,
  etapaVencida: andamento(v) && abertas.some((e) => e.prevista && e.prevista < hoje),
  contratoVencido: andamento(v) && !!v.prazo_contrato && v.prazo_contrato < hoje,
  concluidas: v.etapas.length - abertas.length, total: v.etapas.length };
}
export function filtrarVendas(vendas: VendaCorretor[], filtro: string, hoje: string) {
 return vendas.filter((v) => filtro === "todas" || (filtro === "concluidas" ? v.status === "concluido" : filtro === "vencidas" ? resumoVenda(v, hoje).etapaVencida || resumoVenda(v, hoje).contratoVencido : andamento(v)));
}
export function dataVenda(data: string | null) { if (!data) return "Prazo ainda não definido"; return new Date(`${data}T12:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }); }

export const STATUS_COMISSAO: Record<string, string> = { "0% pago": "Aguardando pagamento", "50% pago": "Parcialmente paga (50%)", "100% pago": "Paga", cancelada: "Cancelada" };
export function listarComissoes(vendas: VendaCorretor[], filtro = "todas") {
 return vendas.flatMap(venda => (venda.comissoes ?? []).map(comissao => ({ venda, comissao }))).filter(({ comissao }) => filtro === "todas" || (filtro === "pendentes" ? ["0% pago", "50% pago"].includes(comissao.status) : comissao.status === filtro));
}
export function resumoComissoes(vendas: VendaCorretor[]) {
 const registros = listarComissoes(vendas).map(item => item.comissao);
 return { pendentes: registros.filter(c => c.status === "0% pago").length, parciais: registros.filter(c => c.status === "50% pago").length, pagas: registros.filter(c => c.status === "100% pago").length };
}
export function valorComissao(valor: number | null) { return valor === null ? "Não informado" : valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
