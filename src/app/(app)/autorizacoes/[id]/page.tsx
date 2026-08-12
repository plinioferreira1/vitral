import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VoltarLink } from "@/components/voltar-link";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { BotaoCertificadoAutorizacao } from "@/components/botao-certificado-autorizacao";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { cancelarAutorizacao } from "../actions";
import { apagarAutorizacao } from "../bulk-actions";

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

function brl(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AutorizacaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: autorizacao } = await supabase
    .from("autorizacoes_venda")
    .select("*, imoveis ( endereco ), clientes!autorizacoes_venda_vendedor_id_fkey ( nome )")
    .eq("id", id)
    .single();

  if (!autorizacao) notFound();

  const a = autorizacao as unknown as {
    id: string;
    status: string;
    valor_imovel: number | null;
    comissao_percentual: number | null;
    prazo_dias: number | null;
    exclusividade: boolean;
    observacoes: string | null;
    foro: string;
    imoveis: { endereco: string } | null;
    clientes: { nome: string } | null;
  };

  const { data: signatarios } = await supabase
    .from("autorizacao_signatarios")
    .select("*")
    .eq("autorizacao_id", id)
    .order("ordem", { ascending: true });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <VoltarLink href="/autorizacoes" label="Autorizações" />
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {a.imoveis?.endereco ?? "—"}
          </h1>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_COR[a.status]}`}
          >
            {STATUS_LABEL[a.status]}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-muted">Proprietário: {a.clientes?.nome ?? "—"}</p>
        {a.status === "assinado" && (
          <div className="mt-3">
            <BotaoCertificadoAutorizacao
              imovelEndereco={a.imoveis?.endereco ?? "—"}
              vendedorNome={a.clientes?.nome ?? "—"}
              valorImovel={a.valor_imovel}
              comissaoPercentual={a.comissao_percentual}
              prazoDias={a.prazo_dias}
              exclusividade={a.exclusividade}
              foro={a.foro}
              assinaturas={(signatarios ?? [])
                .filter((s) => s.assinado_em)
                .map((s) => ({
                  titulo: s.nome_esperado,
                  nome: s.nome_digitado ?? "",
                  assinaturaImagem: s.assinatura_imagem ?? "",
                  assinadoEm: s.assinado_em,
                  ip: s.ip_assinatura,
                }))}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/60 bg-surface p-5 shadow-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-ink-muted">Valor do imóvel</p>
          <p className="text-sm font-medium text-ink">{brl(a.valor_imovel)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">Comissão</p>
          <p className="text-sm font-medium text-ink">
            {a.comissao_percentual ? `${a.comissao_percentual}%` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">Prazo</p>
          <p className="text-sm font-medium text-ink">
            {a.prazo_dias ? `${a.prazo_dias} dias` : "—"}
            {a.exclusividade ? " · exclusividade" : ""}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-ink">Assinaturas</h2>
        <ul className="space-y-3">
          {(signatarios ?? []).map((s) => (
            <li key={s.id} className="rounded-lg border border-border/60 bg-background p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{s.nome_esperado}</p>
                {s.assinado_em ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Assinado
                  </span>
                ) : (
                  <span className="rounded-full border border-border-strong bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">
                    Pendente
                  </span>
                )}
              </div>

              {s.assinado_em ? (
                <div className="mt-3">
                  <p className="text-xs text-ink-muted">
                    {s.nome_digitado} · assinado em{" "}
                    {new Date(s.assinado_em).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                    {s.ip_assinatura ? ` · IP ${s.ip_assinatura}` : ""}
                  </p>
                  {s.assinatura_imagem && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.assinatura_imagem}
                      alt={`Assinatura de ${s.nome_digitado}`}
                      className="mt-2 h-20 rounded border border-border bg-white"
                    />
                  )}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <BotaoCopiarLink url={`${siteUrl}/assinar/${s.token}`} />
                  <a
                    href={`/assinar/${s.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Abrir pra assinar agora →
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {a.status === "pendente" && (
        <form action={cancelarAutorizacao}>
          <input type="hidden" name="id" value={a.id} />
          <button
            type="submit"
            className="text-xs font-medium text-ink-muted hover:text-rose-600"
          >
            Cancelar esta autorização
          </button>
        </form>
      )}

      <form action={apagarAutorizacao}>
        <input type="hidden" name="id" value={a.id} />
        <BotaoComConfirmacao
          mensagem="Apagar esta autorização? Essa ação não pode ser desfeita."
          className="text-xs font-medium text-ink-muted hover:text-rose-600"
        >
          Apagar autorização
        </BotaoComConfirmacao>
      </form>
    </div>
  );
}
