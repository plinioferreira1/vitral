import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VoltarLink } from "@/components/voltar-link";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { BotaoCertificadoVisita } from "@/components/botao-certificado-visita";
import { cancelarTermoVisita, atualizarFeedbackVisita } from "../actions";

const STATUS_COR: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-700 border-amber-100",
  assinado: "bg-emerald-50 text-emerald-700 border-emerald-100",
  cancelado: "bg-stone-100 text-stone-500 border-stone-200",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando assinatura",
  assinado: "Assinado",
  cancelado: "Cancelado",
};

const FEEDBACK_LABEL: Record<string, string> = {
  vai_fazer_proposta: "Gostou e vai fazer proposta",
  vai_voltar: "Gostou mas vai querer voltar no imóvel",
  vai_manter_consideracao: "Gostou e vai manter este imóvel nas suas considerações",
  nao_gostou_quer_outras: "Não gostou do imóvel e quer ver outras opções",
};

function brl(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function TermoVisitaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: termo } = await supabase
    .from("termos_visita")
    .select("*, imoveis ( endereco ), clientes ( nome, telefone, email ), corretores ( nome )")
    .eq("id", id)
    .single();

  if (!termo) notFound();

  const t = termo as unknown as {
    id: string;
    status: string;
    valor_imovel: number | null;
    codigo_imovel: string | null;
    data_visita: string;
    multa_percentual: number;
    nota: number | null;
    feedback: string | null;
    observacoes: string | null;
    token: string;
    nome_digitado: string | null;
    cliente_cpf: string | null;
    assinatura_imagem: string | null;
    assinado_em: string | null;
    ip_assinatura: string | null;
    imoveis: { endereco: string } | null;
    clientes: { nome: string; telefone: string | null; email: string | null } | null;
    corretores: { nome: string } | null;
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <VoltarLink href="/termos-visita" label="Termos de Visita" />
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {t.imoveis?.endereco ?? "—"}
          </h1>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_COR[t.status]}`}
          >
            {STATUS_LABEL[t.status]}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-muted">Cliente: {t.clientes?.nome ?? "—"}</p>
        {t.status === "assinado" && t.assinado_em && (
          <div className="mt-3">
            <BotaoCertificadoVisita
              imovelEndereco={t.imoveis?.endereco ?? "—"}
              clienteNome={t.clientes?.nome ?? "—"}
              valorImovel={t.valor_imovel}
              corretorNome={t.corretores?.nome ?? null}
              multaPercentual={t.multa_percentual}
              assinatura={{
                titulo: "Cliente",
                nome: t.nome_digitado ?? "",
                documento: t.cliente_cpf ?? undefined,
                assinaturaImagem: t.assinatura_imagem ?? "",
                assinadoEm: t.assinado_em,
                ip: t.ip_assinatura,
              }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/60 bg-surface p-5 shadow-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-ink-muted">Valor do imóvel</p>
          <p className="text-sm font-medium text-ink">{brl(t.valor_imovel)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">Data da visita</p>
          <p className="text-sm font-medium text-ink">
            {new Date(t.data_visita + "T00:00:00").toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">Corretor</p>
          <p className="text-sm font-medium text-ink">{t.corretores?.nome ?? "—"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-ink">Assinatura</h2>
        {t.assinado_em ? (
          <div>
            <p className="text-xs text-ink-muted">
              {t.nome_digitado}
              {t.cliente_cpf ? ` · CPF ${t.cliente_cpf}` : ""} · assinado em{" "}
              {new Date(t.assinado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              {t.ip_assinatura ? ` · IP ${t.ip_assinatura}` : ""}
            </p>
            {t.assinatura_imagem && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.assinatura_imagem}
                alt={`Assinatura de ${t.nome_digitado}`}
                className="mt-2 h-20 rounded border border-border bg-white"
              />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <BotaoCopiarLink url={`${siteUrl}/visita/${t.token}`} />
            <a
              href={`/visita/${t.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-brand hover:underline"
            >
              Abrir pra assinar agora →
            </a>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-ink">Feedback da visita</h2>
        <form action={atualizarFeedbackVisita} className="space-y-3">
          <input type="hidden" name="id" value={t.id} />
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Nota (0 a 10)
            </label>
            <input
              name="nota"
              type="number"
              min={0}
              max={10}
              defaultValue={t.nota ?? undefined}
              className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Impressão</label>
            <select
              name="feedback"
              defaultValue={t.feedback ?? ""}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">Não informado</option>
              {Object.entries(FEEDBACK_LABEL).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Observações</label>
            <textarea
              name="observacoes"
              rows={3}
              defaultValue={t.observacoes ?? ""}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background"
          >
            Salvar feedback
          </button>
        </form>
      </div>

      {t.status === "pendente" && (
        <form action={cancelarTermoVisita}>
          <input type="hidden" name="id" value={t.id} />
          <button type="submit" className="text-xs font-medium text-ink-muted hover:text-rose-600">
            Cancelar este termo
          </button>
        </form>
      )}
    </div>
  );
}
