import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VoltarLink } from "@/components/voltar-link";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { obterSiteUrl } from "@/lib/site-url";
import { cancelarCartaProposta, salvarResponsavelCartaProposta } from "../actions";
import { apagarCartaProposta } from "../bulk-actions";

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

export default async function PropostaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: propostaRaw } = await supabase
    .from("cartas_proposta")
    .select(
      "*, imoveis ( endereco ), clientes!cartas_proposta_proponente_id_fkey ( nome, cpf_cnpj ), usuarios!cartas_proposta_criado_por_fkey ( nome ), responsavel:usuarios!cartas_proposta_responsavel_id_fkey ( id, nome )"
    )
    .eq("id", id)
    .single();

  if (!propostaRaw) notFound();

  const p = propostaRaw as unknown as {
    id: string;
    status: string;
    valor_total: number | null;
    prazo_dias_validade: number | null;
    observacoes: string | null;
    imoveis: { endereco: string } | null;
    clientes: { nome: string; cpf_cnpj: string | null } | null;
    usuarios: { nome: string } | null;
    responsavel: { id: string; nome: string } | null;
  };

  const { data: membros } = await supabase
    .from("usuarios")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  const { data: condicoes } = await supabase
    .from("carta_proposta_condicoes")
    .select("descricao, valor")
    .eq("carta_proposta_id", id)
    .order("ordem", { ascending: true });

  const { data: signatarios } = await supabase
    .from("carta_proposta_signatarios")
    .select("*")
    .eq("carta_proposta_id", id)
    .order("ordem", { ascending: true });

  const siteUrl = await obterSiteUrl();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <VoltarLink href="/propostas" label="Cartas Proposta" />
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {p.imoveis?.endereco ?? "—"}
          </h1>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_COR[p.status]}`}>
            {STATUS_LABEL[p.status]}
          </span>
          {p.status === "pendente" && (
            <Link
              href={`/propostas/${p.id}/editar`}
              className="text-xs font-medium text-brand hover:underline"
            >
              Editar
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-muted">Proponente: {p.clientes?.nome ?? "—"}</p>
        <p className="mt-0.5 text-xs text-ink-muted">Criado por: {p.usuarios?.nome ?? "—"}</p>
        <form action={salvarResponsavelCartaProposta} className="mt-1.5 flex items-center gap-1.5">
          <input type="hidden" name="id" value={p.id} />
          <label className="text-xs text-ink-muted">Responsável:</label>
          <select
            name="responsavel_id"
            defaultValue={p.responsavel?.id ?? ""}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-ink outline-none focus:border-brand"
          >
            <option value="">Ninguém</option>
            {(membros ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-ink hover:opacity-80"
          >
            Salvar
          </button>
        </form>
        <p className="mt-0.5 text-[11px] text-ink-muted">
          Só quem criou ou o responsável enxerga o formulário completo desta proposta.
        </p>
        {p.status === "assinado" && (
          <div className="mt-3">
            <a
              href={`/propostas/${p.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background"
            >
              Baixar PDF da proposta assinada
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <div>
          <p className="text-xs text-ink-muted">Valor total da proposta</p>
          <p className="text-sm font-medium text-ink">{brl(p.valor_total)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">Validade</p>
          <p className="text-sm font-medium text-ink">
            {p.prazo_dias_validade ? `${p.prazo_dias_validade} dias úteis` : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-ink">Condições de pagamento</h2>
        {(condicoes ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma condição informada.</p>
        ) : (
          <ul className="space-y-1.5 text-sm text-ink">
            {(condicoes ?? []).map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="text-ink-muted">{c.descricao}</span>
                <span className="font-medium">{brl(c.valor)}</span>
              </li>
            ))}
          </ul>
        )}
        {p.observacoes && (
          <p className="mt-3 border-t border-border pt-3 text-sm text-ink-muted">
            {p.observacoes}
          </p>
        )}
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
                  <BotaoCopiarLink url={`${siteUrl}/assinar-proposta/${s.token}`} />
                  <a
                    href={`/assinar-proposta/${s.token}`}
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

      {p.status === "pendente" && (
        <form action={cancelarCartaProposta}>
          <input type="hidden" name="id" value={p.id} />
          <button type="submit" className="text-xs font-medium text-ink-muted hover:text-rose-600">
            Cancelar esta proposta
          </button>
        </form>
      )}

      <form action={apagarCartaProposta}>
        <input type="hidden" name="id" value={p.id} />
        <BotaoComConfirmacao
          mensagem="Apagar esta proposta? Essa ação não pode ser desfeita."
          className="text-xs font-medium text-ink-muted hover:text-rose-600"
        >
          Apagar proposta
        </BotaoComConfirmacao>
      </form>
    </div>
  );
}
