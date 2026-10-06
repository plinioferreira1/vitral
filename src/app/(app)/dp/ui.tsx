import { ROTULO_SITUACAO_DIA, ROTULO_STATUS_HOJE, type SituacaoDia, type StatusHoje } from "@/lib/dp/ponto";
import { iniciais } from "./dados";

export const ROTULO = "mb-1 block text-xs font-medium text-ink-muted";
export const BOTAO_MINI = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition hover:bg-background hover:text-ink";

export function Avatar({ c, tamanho = 40 }: { c: { id: string; nome: string; foto_caminho: string | null }; tamanho?: number }) {
  const estilo = { width: tamanho, height: tamanho };
  if (c.foto_caminho) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/dp/arquivo?tipo=foto&id=${c.id}`} alt="" style={estilo} className="shrink-0 rounded-full border border-border object-cover" />;
  }
  return (
    <span style={estilo} className="flex shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
      {iniciais(c.nome)}
    </span>
  );
}

const TOM_HOJE: Record<StatusHoje, string> = {
  trabalhando: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  intervalo: "bg-sky-50 text-sky-800 ring-sky-200",
  sem_entrada: "bg-amber-50 text-amber-800 ring-amber-200",
  ferias: "bg-violet-50 text-violet-800 ring-violet-200",
  folga: "bg-stone-100 text-stone-600 ring-stone-200",
  afastado: "bg-orange-50 text-orange-800 ring-orange-200",
  falta: "bg-rose-50 text-rose-800 ring-rose-200",
  finalizado: "bg-stone-100 text-stone-700 ring-stone-200",
  sem_ponto: "bg-stone-50 text-stone-500 ring-stone-200",
};
export function SeloHoje({ status }: { status: StatusHoje }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TOM_HOJE[status]}`}>{ROTULO_STATUS_HOJE[status]}</span>;
}

const TOM_DIA: Record<SituacaoDia, string> = {
  normal: "text-emerald-700",
  hora_extra: "text-sky-700",
  atraso: "text-amber-700",
  falta: "text-rose-700",
  ferias: "text-violet-700",
  folga: "text-ink-muted",
  afastamento: "text-orange-700",
  ponto_incompleto: "text-rose-700",
  em_andamento: "text-emerald-700",
  sem_registro: "text-ink-muted",
};
export function SituacaoDiaTexto({ situacao, detalhe }: { situacao: SituacaoDia; detalhe?: string | null }) {
  return <span className={`text-xs font-medium ${TOM_DIA[situacao]}`}>{detalhe && situacao === "afastamento" ? detalhe : ROTULO_SITUACAO_DIA[situacao]}</span>;
}

export const ROTULO_STATUS_COLAB: Record<string, string> = { ativo: "Ativo", inativo: "Inativo", desligado: "Desligado" };
