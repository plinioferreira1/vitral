import { AlertTriangle, CheckCircle2, Clock, Globe, Mail, MailQuestion, MinusCircle, type LucideIcon } from "lucide-react";
import {
  ROTULO_METODO_CURTO,
  ROTULO_SITUACAO_SOLICITACAO,
  ROTULO_STATUS,
  ROTULO_STATUS_CURTO,
  type MetodoConsulta,
  type SituacaoSolicitacao,
  type StatusVerificacao,
} from "@/lib/debitos/regras";

const TOM_STATUS: Record<StatusVerificacao, { classe: string; Icone: LucideIcon }> = {
  pendente: { classe: "bg-amber-50 text-amber-800 ring-amber-200", Icone: Clock },
  aguardando_administradora: { classe: "bg-sky-50 text-sky-800 ring-sky-200", Icone: MailQuestion },
  sem_debitos: { classe: "bg-emerald-50 text-emerald-800 ring-emerald-200", Icone: CheckCircle2 },
  com_debitos: { classe: "bg-rose-50 text-rose-800 ring-rose-200", Icone: AlertTriangle },
  nao_se_aplica: { classe: "bg-stone-100 text-stone-600 ring-stone-200", Icone: MinusCircle },
};

export function SeloStatus({ status, completo = false }: { status: StatusVerificacao | null | undefined; completo?: boolean }) {
  if (!status) return <span className="text-xs text-ink-muted">—</span>;
  const { classe, Icone } = TOM_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${classe}`} title={ROTULO_STATUS[status]}>
      <Icone size={12} strokeWidth={2.25} aria-hidden="true" />
      {completo ? ROTULO_STATUS[status] : ROTULO_STATUS_CURTO[status]}
    </span>
  );
}

export function SeloMetodo({ metodo }: { metodo: MetodoConsulta | null }) {
  if (!metodo) return <span className="text-xs text-ink-muted">—</span>;
  const Icone = metodo === "portal" ? Globe : metodo === "email" ? Mail : MinusCircle;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink-muted">
      <Icone size={13} aria-hidden="true" />
      {ROTULO_METODO_CURTO[metodo]}
    </span>
  );
}

const TOM_SOLICITACAO: Record<SituacaoSolicitacao, string> = {
  falha: "bg-rose-50 text-rose-800 ring-rose-200",
  aguardando: "bg-amber-50 text-amber-800 ring-amber-200",
  sem_resposta: "bg-rose-50 text-rose-800 ring-rose-200",
  respondido: "bg-sky-50 text-sky-800 ring-sky-200",
  conferido: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

export function SeloSolicitacao({ situacao }: { situacao: SituacaoSolicitacao }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TOM_SOLICITACAO[situacao]}`}>
      {ROTULO_SITUACAO_SOLICITACAO[situacao]}
    </span>
  );
}

export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function moeda(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const ROTULO = "mb-1 block text-xs font-medium text-ink-muted";

/** Monta o endereço do painel preservando os filtros atuais. */
export function hrefPainel(atual: Record<string, string | undefined>, mudancas: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...atual, ...mudancas })) {
    if (valor) params.set(chave, valor);
  }
  const texto = params.toString();
  return texto ? `/locacao/debitos?${texto}` : "/locacao/debitos";
}
