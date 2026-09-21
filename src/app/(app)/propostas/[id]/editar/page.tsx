import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import { BotaoSubmit } from "@/components/botao-submit";
import { atualizarCartaProposta } from "../../actions";

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

const NUM_CONDICOES = 6;

export default async function EditarCartaPropostaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: propostaRaw } = await supabase
    .from("cartas_proposta")
    .select(
      "*, imoveis ( endereco ), proponente:clientes!cartas_proposta_proponente_id_fkey ( * ), segundo_proponente:clientes!cartas_proposta_segundo_proponente_id_fkey ( * )"
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
    proponente: { nome: string; cpf_cnpj: string | null } | null;
    segundo_proponente: { nome: string; cpf_cnpj: string | null } | null;
  };

  if (p.status !== "pendente") {
    redirect(`/propostas/${id}`);
  }

  const { data: condicoesRaw } = await supabase
    .from("carta_proposta_condicoes")
    .select("descricao, valor")
    .eq("carta_proposta_id", id)
    .order("ordem", { ascending: true });
  const condicoes = condicoesRaw ?? [];

  const { data: signatarios } = await supabase
    .from("carta_proposta_signatarios")
    .select("ordem")
    .eq("carta_proposta_id", id);
  const temSegundoProponente = (signatarios ?? []).some((s) => s.ordem === 2);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <VoltarLink href={`/propostas/${id}`} label="Proposta" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Editar carta proposta</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Só é possível editar enquanto ninguém tiver assinado.
        </p>
      </div>

      <form
        action={atualizarCartaProposta}
        className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-sm"
      >
        <input type="hidden" name="id" value={p.id} />

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Proponente (comprador)
          </p>
          <div className="space-y-3">
            <input
              name="proponente_nome"
              required
              defaultValue={p.proponente?.nome ?? ""}
              placeholder="Nome completo"
              className={campoClasse}
            />
            <input
              name="proponente_cpf"
              defaultValue={p.proponente?.cpf_cnpj ?? ""}
              placeholder="CPF"
              className={campoClasse}
            />
          </div>
        </div>

        <details className="group" open={!!p.segundo_proponente || temSegundoProponente}>
          <summary className="cursor-pointer select-none text-xs font-medium text-brand">
            + Adicionar segundo proponente
          </summary>
          <div className="mt-3 space-y-3">
            <input
              name="segundo_proponente_nome"
              defaultValue={p.segundo_proponente?.nome ?? ""}
              placeholder="Nome completo"
              className={campoClasse}
            />
            <input
              name="segundo_proponente_cpf"
              defaultValue={p.segundo_proponente?.cpf_cnpj ?? ""}
              placeholder="CPF"
              className={campoClasse}
            />
          </div>
        </details>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Imóvel (referência da proposta)
          </label>
          <input
            name="imovel"
            required
            defaultValue={p.imoveis?.endereco ?? ""}
            className={campoClasse}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Valor total da proposta
          </label>
          <CampoMoeda name="valor_total" defaultValue={p.valor_total} placeholder="735.000,00" />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Condições de pagamento
          </p>
          <div className="space-y-2">
            {Array.from({ length: NUM_CONDICOES }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  name={`condicao_descricao_${i}`}
                  defaultValue={condicoes[i]?.descricao ?? ""}
                  placeholder="Descrição da condição"
                  className={campoClasse}
                />
                <div className="w-36">
                  <CampoMoeda
                    name={`condicao_valor_${i}`}
                    defaultValue={condicoes[i]?.valor ?? null}
                    placeholder="0,00"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Prazo de validade da proposta (dias úteis)
          </label>
          <input
            name="prazo_dias_validade"
            type="number"
            defaultValue={p.prazo_dias_validade ?? 5}
            className={`${campoClasse} max-w-[140px]`}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Observações (opcional)
          </label>
          <textarea
            name="observacoes"
            rows={3}
            defaultValue={p.observacoes ?? ""}
            className={campoClasse}
          />
        </div>

        <BotaoSubmit className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Salvar alterações
        </BotaoSubmit>
      </form>
    </div>
  );
}
