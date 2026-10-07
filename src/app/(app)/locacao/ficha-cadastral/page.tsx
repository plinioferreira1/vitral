import Link from "next/link";
import { FileText, Plus, UserRoundCheck } from "lucide-react";
import { ROTULO_TIPO, tipoLocatario } from "@/lib/ficha-locacao/campos";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const STATUS: Record<string, { label: string; classe: string }> = {
  aguardando: { label: "Aguardando", classe: "bg-amber-50 text-amber-700" },
  em_preenchimento: { label: "Em preenchimento", classe: "bg-blue-50 text-blue-700" },
  concluida: { label: "Enviada para conferência", classe: "bg-emerald-50 text-emerald-700" },
  cancelada: { label: "Cancelada", classe: "bg-slate-100 text-slate-500" },
};

export default async function FichasCadastraisLocacaoPage() {
  const supabase = await createClient() as unknown as SupabaseClient;
  const { data } = await supabase.from("fichas_cadastrais_locacao")
    .select("id, proponente_nome, proponente_email, imovel_referencia, status, criado_em, tipo_locatario")
    .order("criado_em", { ascending: false });
  const fichas = data ?? [];
  const concluidas = fichas.filter((f) => f.status === "concluida").length;
  const pendentes = fichas.filter((f) => ["aguardando", "em_preenchimento"].includes(f.status)).length;
  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Locação</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Fichas cadastrais</h1><p className="mt-2 text-sm text-ink-muted">Crie links seguros e acompanhe o preenchimento dos proponentes.</p></div><Link href="/locacao/ficha-cadastral/nova" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"><Plus className="h-4 w-4" /> Nova ficha</Link></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border bg-white p-4"><p className="text-xs font-medium text-ink-muted">Total</p><p className="mt-1 text-2xl font-bold">{fichas.length}</p></div><div className="rounded-xl border border-border bg-white p-4"><p className="text-xs font-medium text-ink-muted">Aguardando cliente</p><p className="mt-1 text-2xl font-bold text-amber-700">{pendentes}</p></div><div className="rounded-xl border border-border bg-white p-4"><p className="text-xs font-medium text-ink-muted">Recebidas para conferência</p><p className="mt-1 text-2xl font-bold text-emerald-700">{concluidas}</p></div></div>
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">{fichas.length === 0 ? <div className="flex flex-col items-center px-6 py-16 text-center"><UserRoundCheck className="h-10 w-10 text-gold" /><h2 className="mt-4 font-semibold">Nenhuma ficha criada</h2><p className="mt-1 max-w-md text-sm text-ink-muted">Crie a primeira solicitação para gerar o link que será enviado ao proponente.</p></div> : <div className="divide-y divide-border">{fichas.map((f) => { const status = STATUS[f.status] ?? STATUS.aguardando; return <Link key={f.id} href={`/locacao/ficha-cadastral/${f.id}`} className="flex flex-col gap-3 p-4 transition hover:bg-background sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex min-w-0 items-start gap-3"><div className="rounded-lg bg-brand-soft p-2 text-brand"><FileText className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate font-semibold text-ink">{f.proponente_nome || "Proponente não informado"}{f.tipo_locatario !== "titular" && <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 align-middle text-[10px] font-semibold text-violet-800">{ROTULO_TIPO[tipoLocatario(f.tipo_locatario)]}</span>}</p><p className="truncate text-sm text-ink-muted">{f.imovel_referencia}</p><p className="mt-1 text-xs text-ink-muted">{f.proponente_email}</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.classe}`}>{status.label}</span><span className="text-xs text-ink-muted">{new Date(f.criado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span></div></Link>; })}</div>}</div>
  </div>;
}
