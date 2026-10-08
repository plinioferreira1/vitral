"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Download, FileText, Trash2, UserRoundCheck } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { ROTULO_TIPO, tipoLocatario } from "@/lib/ficha-locacao/campos";
import { excluirFichasLocacao } from "./actions";

export type FichaLista = {
  id: string; proponente_nome: string | null; proponente_email: string | null;
  imovel_referencia: string | null; status: string; criado_em: string;
  tipo_locatario: string; ficha_principal_id: string | null;
};

const STATUS: Record<string, { label: string; classe: string }> = {
  aguardando: { label: "Aguardando", classe: "bg-amber-50 text-amber-700" },
  em_preenchimento: { label: "Em preenchimento", classe: "bg-blue-50 text-blue-700" },
  concluida: { label: "Enviada para conferência", classe: "bg-emerald-50 text-emerald-700" },
  cancelada: { label: "Cancelada", classe: "bg-slate-100 text-slate-500" },
};

export function ListaFichas({ fichas, podeExcluir }: { fichas: FichaLista[]; podeExcluir: boolean }) {
  // A chave muda depois de uma exclusão/revalidação, descartando a seleção antiga.
  return <SelecaoFichas key={fichas.map((f) => `${f.id}:${f.ficha_principal_id}`).join(",")} fichas={fichas} podeExcluir={podeExcluir} />;
}

function SelecaoFichas({ fichas, podeExcluir }: { fichas: FichaLista[]; podeExcluir: boolean }) {
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const selecionadas = new Set(marcadas);
  // Selecionar o titular inclui as pessoas vinculadas, que o banco exclui junto.
  for (const ficha of fichas) {
    if (ficha.ficha_principal_id && marcadas.includes(ficha.ficha_principal_id)) selecionadas.add(ficha.id);
  }
  const vinculadas = fichas.filter((f) => f.ficha_principal_id && marcadas.includes(f.ficha_principal_id)).length;
  return <form action={excluirFichasLocacao} onSubmit={(evento) => {
    const mensagem = `Excluir definitivamente ${selecionadas.size} ficha(s)${vinculadas ? `, incluindo ${vinculadas} pessoa(s) vinculada(s)` : ""}? Os dados, assinaturas e anexos serão apagados e os links deixarão de funcionar. Esta ação não pode ser desfeita.`;
    if (!selecionadas.size || !window.confirm(mensagem)) evento.preventDefault();
  }} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    {[...selecionadas].map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
    <ConteudoFichas fichas={fichas} podeExcluir={podeExcluir} selecionadas={selecionadas} marcadas={marcadas} setMarcadas={setMarcadas} vinculadas={vinculadas} />
  </form>;
}

function ConteudoFichas({ fichas, podeExcluir, selecionadas, marcadas, setMarcadas, vinculadas }: {
  fichas: FichaLista[]; podeExcluir: boolean; selecionadas: Set<string>; marcadas: string[];
  setMarcadas: React.Dispatch<React.SetStateAction<string[]>>; vinculadas: number;
}) {
  const { pending } = useFormStatus();
  if (!fichas.length) return <div className="flex flex-col items-center px-6 py-16 text-center"><UserRoundCheck className="h-10 w-10 text-gold" /><h2 className="mt-4 font-semibold">Nenhuma ficha criada</h2><p className="mt-1 max-w-md text-sm text-ink-muted">Crie a primeira solicitação para gerar o link que será enviado ao proponente.</p></div>;
  return <>
    {podeExcluir && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/50 px-4 py-3 sm:px-5">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink">
        <input type="checkbox" className="h-4 w-4 accent-brand" checked={selecionadas.size === fichas.length} disabled={pending} onChange={(e) => setMarcadas(e.target.checked ? fichas.map((f) => f.id) : [])} />
        Selecionar todas
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <span aria-live="polite" className="text-xs text-ink-muted">{selecionadas.size} selecionada(s){vinculadas > 0 ? ` · ${vinculadas} vinculada(s) incluída(s)` : ""}</span>
        {selecionadas.size > 0 && <button type="button" disabled={pending} onClick={() => setMarcadas([])} className="min-h-11 text-xs font-semibold text-ink-muted hover:text-ink">Limpar seleção</button>}
        <BotaoEnviar disabled={!selecionadas.size || selecionadas.size > 100} textoEnviando="Excluindo…" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 disabled:opacity-40"><Trash2 size={16} /> Excluir selecionadas</BotaoEnviar>
      </div>
      {selecionadas.size > 100 && <p role="alert" className="w-full text-xs text-rose-700">Exclua até 100 fichas por vez.</p>}
      {vinculadas > 0 && <p className="w-full text-xs text-ink-muted">As fichas de corresponsáveis e fiadores do titular selecionado serão excluídas junto.</p>}
    </div>}
    <div className="divide-y divide-border">{fichas.map((f) => {
      const status = STATUS[f.status] ?? STATUS.aguardando;
      const vinculadaSelecionada = !!f.ficha_principal_id && marcadas.includes(f.ficha_principal_id);
      return <div key={f.id} className={`flex items-start gap-2 p-3 transition sm:items-center sm:gap-3 sm:px-5 sm:py-4 ${selecionadas.has(f.id) ? "bg-brand-soft/40" : "hover:bg-background"}`}>
        {podeExcluir && <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center"><input type="checkbox" aria-label={`Selecionar ficha de ${f.proponente_nome || "proponente não informado"}`} title={vinculadaSelecionada ? "Incluída com a ficha do titular" : undefined} className="h-4 w-4 accent-brand" checked={selecionadas.has(f.id)} disabled={pending || vinculadaSelecionada} onChange={(e) => setMarcadas((anteriores) => e.target.checked ? [...anteriores, f.id] : anteriores.filter((id) => id !== f.id))} /></label>}
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/locacao/ficha-cadastral/${f.id}`} className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-lg focus-visible:outline-brand">
            <div className="hidden rounded-lg bg-brand-soft p-2 text-brand sm:block"><FileText size={20} /></div>
            <div className="min-w-0"><p className="break-words font-semibold text-ink">{f.proponente_nome || "Proponente não informado"}</p><p className="mt-0.5 text-xs font-medium text-brand">{ROTULO_TIPO[tipoLocatario(f.tipo_locatario)]}</p><p className="mt-1 break-words text-sm text-ink-muted">{f.imovel_referencia}</p><p className="mt-1 break-all text-xs text-ink-muted">{f.proponente_email}</p></div>
          </Link>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.classe}`}>{status.label}</span>
            <span className="text-xs text-ink-muted">{new Date(f.criado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
            {f.status === "concluida" && <a href={`/locacao/ficha-cadastral/${f.id}/pdf`} aria-label={`Baixar PDF assinado de ${f.proponente_nome}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-brand hover:bg-brand-soft"><Download size={15} /> PDF assinado</a>}
          </div>
        </div>
      </div>;
    })}</div>
  </>;
}
