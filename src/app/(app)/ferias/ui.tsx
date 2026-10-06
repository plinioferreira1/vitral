import Link from "next/link";
import { ROTULO_SITUACAO, type Situacao } from "@/lib/ferias/regras";
import type { AcessoFerias } from "./dados";

const TOM: Record<Situacao, string> = {
  rascunho: "bg-stone-100 text-stone-700 ring-stone-200",
  aguardando_analise: "bg-amber-50 text-amber-800 ring-amber-200",
  aguardando_gestor: "bg-amber-50 text-amber-800 ring-amber-200",
  aguardando_colaborador: "bg-violet-50 text-violet-800 ring-violet-200",
  aprovado: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  programado: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  em_ferias: "bg-sky-50 text-sky-800 ring-sky-200",
  concluido: "bg-stone-100 text-stone-600 ring-stone-200",
  recusado: "bg-rose-50 text-rose-800 ring-rose-200",
  cancelado: "bg-stone-100 text-stone-500 ring-stone-200",
};

export function SeloSituacao({ situacao, texto }: { situacao: Situacao; texto?: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TOM[situacao]}`}>{texto ?? ROTULO_SITUACAO[situacao]}</span>;
}

export const ROTULO = "mb-1 block text-xs font-medium text-ink-muted";
export const ROTULO_TIPO: Record<string, string> = { ferias: "Férias", alteracao: "Alteração de férias", cancelamento: "Cancelamento de férias" };

export function NavFerias({ acesso, atual, pendentes = 0 }: { acesso: AcessoFerias; atual: "minhas" | "equipe" | "calendario" | "cadastro"; pendentes?: number }) {
  const abas: [typeof atual, string, string][] = [["minhas", "Minhas férias", "/ferias"]];
  if (acesso.analisa) abas.push(["equipe", "Solicitações de férias", "/ferias/equipe"], ["calendario", "Calendário da equipe", "/ferias/equipe?aba=calendario"]);
  if (acesso.administrador) abas.push(["cadastro", "Cadastro", "/ferias/configuracao"]);
  if (abas.length === 1) return null;
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1">
      {abas.map(([id, rotulo, href]) => (
        <Link key={id} href={href} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${atual === id ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink"}`}>
          {rotulo}
          {id === "equipe" && pendentes > 0 && <span className="num ml-1.5 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">{pendentes}</span>}
        </Link>
      ))}
    </nav>
  );
}
