import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import { CampoCPF } from "@/components/campo-cpf";
import { BotaoSubmit } from "@/components/botao-submit";
import { atualizarCartaProposta } from "../../actions";

const campoClasse = `${INPUT_CLASS} min-h-11 text-base sm:text-sm`;

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
    codigo_san: string | null;
    imoveis: { endereco: string } | null;
    proponente: { nome: string; cpf_cnpj: string | null } | null;
    segundo_proponente: { nome: string; cpf_cnpj: string | null } | null;
  };

  if (p.status !== "pendente") {
    redirect(`/propostas/${id}`);
  }

  const [{ data: condicoesRaw }, { data: signatarios }] = await Promise.all([
    supabase
      .from("carta_proposta_condicoes")
      .select("descricao, valor")
      .eq("carta_proposta_id", id)
      .order("ordem", { ascending: true }),
    supabase
      .from("carta_proposta_signatarios")
      .select("ordem")
      .eq("carta_proposta_id", id),
  ]);
  const condicoes = condicoesRaw ?? [];
  const temSegundoProponente = (signatarios ?? []).some((s) => s.ordem === 2);

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
      <div>
        <VoltarLink href={`/propostas/${id}`} label="Proposta" />
        <CabecalhoPagina titulo="Editar carta proposta" descricao={<>
          Só é possível editar enquanto ninguém tiver assinado.
        </>} />
      </div>

      <form
        action={atualizarCartaProposta}
        className={`${CARD_CLASS} space-y-6 p-5 sm:p-7`}
      >
        <input type="hidden" name="id" value={p.id} />

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Proponente (comprador)
          </p>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink">Nome completo do proponente<input name="proponente_nome"
              required
              defaultValue={p.proponente?.nome ?? ""}
              placeholder="Nome completo"
              className={campoClasse}
            /></label>
            <label className="block text-sm font-medium text-ink">CPF do proponente<CampoCPF name="proponente_cpf"
              defaultValue={p.proponente?.cpf_cnpj ?? ""}
              className={campoClasse}
            /></label>
          </div>
        </div>

        <details className="group" open={!!p.segundo_proponente || temSegundoProponente}>
          <summary className="flex min-h-11 cursor-pointer items-center rounded-xl border border-border bg-background/50 p-4 text-sm font-medium text-brand">
            + Adicionar segundo proponente
          </summary>
          <div className="mt-3 space-y-3">
            <label className="block text-sm font-medium text-ink">Nome completo do segundo proponente<input name="segundo_proponente_nome"
              defaultValue={p.segundo_proponente?.nome ?? ""}
              placeholder="Nome completo"
              className={campoClasse}
            /></label>
            <label className="block text-sm font-medium text-ink">CPF do segundo proponente<CampoCPF name="segundo_proponente_cpf"
              defaultValue={p.segundo_proponente?.cpf_cnpj ?? ""}
              className={campoClasse}
            /></label>
          </div>
        </details>

        <div>
          <label htmlFor="imovel" className="mb-1 block text-xs font-medium text-ink-muted">
            Imóvel (referência da proposta)
          </label>
          <input id="imovel" name="imovel"
            required
            defaultValue={p.imoveis?.endereco ?? ""}
            className={campoClasse}
          />
        </div>

        <div>
          <label htmlFor="codigo_san" className="mb-1 block text-xs font-medium text-ink-muted">Código SAN</label>
          <input id="codigo_san" name="codigo_san"
            defaultValue={p.codigo_san ?? ""}
            placeholder="Opcional"
            className={campoClasse}
          />
        </div>

        <div>
          <label htmlFor="valor_total" className="mb-1 block text-xs font-medium text-ink-muted">
            Valor total da proposta
          </label>
          <CampoMoeda id="valor_total" className={campoClasse} name="valor_total" defaultValue={p.valor_total} placeholder="735.000,00" />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Condições de pagamento
          </p>
          <div className="space-y-2">
            {Array.from({ length: NUM_CONDICOES }).map((_, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-border bg-background/40 p-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <label className="block text-sm font-medium text-ink">Condição {i + 1}<input name={`condicao_descricao_${i}`}
                  defaultValue={condicoes[i]?.descricao ?? ""}
                  placeholder="Descrição da condição"
                  className={campoClasse}
                /></label>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-ink">Valor da condição {i + 1}<CampoMoeda name={`condicao_valor_${i}`} className={campoClasse}
                    defaultValue={condicoes[i]?.valor ?? null}
                    placeholder="0,00"
                  /></label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="prazo_dias_validade" className="mb-1 block text-xs font-medium text-ink-muted">
            Prazo de validade da proposta (dias úteis)
          </label>
          <input id="prazo_dias_validade" name="prazo_dias_validade"
            type="number"
            defaultValue={p.prazo_dias_validade ?? 5}
            className={`${campoClasse} max-w-[140px]`}
          />
        </div>

        <div>
          <label htmlFor="observacoes" className="mb-1 block text-xs font-medium text-ink-muted">
            Observações (opcional)
          </label>
          <textarea id="observacoes" name="observacoes"
            rows={3}
            defaultValue={p.observacoes ?? ""}
            className={campoClasse}
          />
        </div>

        <BotaoSubmit className={`${PRIMARY_BUTTON_CLASS} min-h-11 w-full`}>
          Salvar alterações
        </BotaoSubmit>
      </form>
    </div>
  );
}
