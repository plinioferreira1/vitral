import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import { BotaoSubmit } from "@/components/botao-submit";
import { REGIOES_ADMINISTRATIVAS_DF } from "@/lib/circunscricoes-df";
import { atualizarAutorizacao } from "../../actions";

export default async function EditarAutorizacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: autorizacao } = await supabase
    .from("autorizacoes_venda")
    .select(
      "*, imoveis ( * ), vendedor:clientes!autorizacoes_venda_vendedor_id_fkey ( * ), conjuge:clientes!autorizacoes_venda_conjuge_id_fkey ( * )"
    )
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
    imoveis: {
      endereco: string;
      cep: string | null;
      matricula: string | null;
      area_construida: string | null;
      area_lote: string | null;
      inscricao_iptu: string | null;
      valor_condominio: number | null;
      regiao_administrativa: string | null;
    } | null;
    vendedor: {
      nome: string;
      cpf_cnpj: string | null;
      rg: string | null;
      telefone: string | null;
      endereco: string | null;
    } | null;
    conjuge: {
      nome: string;
      cpf_cnpj: string | null;
      rg: string | null;
      telefone: string | null;
      endereco: string | null;
    } | null;
  };

  // Só permite editar enquanto ninguém assinou.
  if (a.status !== "pendente") {
    redirect(`/autorizacoes/${id}`);
  }

  const { data: signatarios } = await supabase
    .from("autorizacao_signatarios")
    .select("ordem")
    .eq("autorizacao_id", id);

  const temSegundoProprietario = (signatarios ?? []).some((s) => s.ordem === 2);

  const campoClasse =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <VoltarLink href={`/autorizacoes/${id}`} label="Autorização" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Editar autorização de venda</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Só é possível editar enquanto nenhum proprietário tiver assinado.
        </p>
      </div>

      <form
        action={atualizarAutorizacao}
        className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-sm"
      >
        <input type="hidden" name="id" value={a.id} />

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Proprietário(a)
          </p>
          <div className="space-y-3">
            <input
              name="vendedor_nome"
              required
              defaultValue={a.vendedor?.nome ?? ""}
              placeholder="Nome completo"
              className={campoClasse}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="vendedor_cpf"
                defaultValue={a.vendedor?.cpf_cnpj ?? ""}
                placeholder="CPF"
                className={campoClasse}
              />
              <input
                name="vendedor_rg"
                defaultValue={a.vendedor?.rg ?? ""}
                placeholder="RG"
                className={campoClasse}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="vendedor_telefone"
                defaultValue={a.vendedor?.telefone ?? ""}
                placeholder="Telefone"
                className={campoClasse}
              />
              <input
                name="vendedor_endereco"
                defaultValue={a.vendedor?.endereco ?? ""}
                placeholder="Endereço"
                className={campoClasse}
              />
            </div>
          </div>
        </div>

        <details className="group" open={!!a.conjuge || temSegundoProprietario}>
          <summary className="cursor-pointer select-none text-xs font-medium text-brand">
            + Adicionar cônjuge / segundo proprietário
          </summary>
          <div className="mt-3 space-y-3">
            <input
              name="conjuge_nome"
              defaultValue={a.conjuge?.nome ?? ""}
              placeholder="Nome completo"
              className={campoClasse}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="conjuge_cpf"
                defaultValue={a.conjuge?.cpf_cnpj ?? ""}
                placeholder="CPF"
                className={campoClasse}
              />
              <input
                name="conjuge_rg"
                defaultValue={a.conjuge?.rg ?? ""}
                placeholder="RG"
                className={campoClasse}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="conjuge_telefone"
                defaultValue={a.conjuge?.telefone ?? ""}
                placeholder="Telefone"
                className={campoClasse}
              />
              <input
                name="conjuge_endereco"
                defaultValue={a.conjuge?.endereco ?? ""}
                placeholder="Endereço"
                className={campoClasse}
              />
            </div>
          </div>
        </details>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Imóvel</p>
          <div className="space-y-3">
            <input
              name="imovel"
              required
              defaultValue={a.imoveis?.endereco ?? ""}
              placeholder="Endereço completo do imóvel"
              className={campoClasse}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Região Administrativa
              </label>
              <input
                name="regiao_administrativa"
                required
                list="regioes-administrativas"
                defaultValue={a.imoveis?.regiao_administrativa ?? ""}
                placeholder="Ex: Águas Claras"
                className={campoClasse}
              />
              <datalist id="regioes-administrativas">
                {REGIOES_ADMINISTRATIVAS_DF.map((ra) => (
                  <option key={ra} value={ra} />
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-ink-muted">
                Usada só pra calcular o foro certo no documento (a circunscrição judiciária do
                imóvel). Comece a digitar pra ver sugestões.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="cep"
                defaultValue={a.imoveis?.cep ?? ""}
                placeholder="CEP"
                className={campoClasse}
              />
              <input
                name="matricula"
                defaultValue={a.imoveis?.matricula ?? ""}
                placeholder="Matrícula"
                className={campoClasse}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="area_construida"
                defaultValue={a.imoveis?.area_construida ?? ""}
                placeholder="Área construída (m²)"
                className={campoClasse}
              />
              <input
                name="area_lote"
                defaultValue={a.imoveis?.area_lote ?? ""}
                placeholder="Área do lote (m²)"
                className={campoClasse}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="inscricao_iptu"
                defaultValue={a.imoveis?.inscricao_iptu ?? ""}
                placeholder="Inscrição de IPTU"
                className={campoClasse}
              />
              <CampoMoeda
                name="valor_condominio"
                defaultValue={a.imoveis?.valor_condominio ?? null}
                placeholder="Condomínio (R$)"
              />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="segundo_proprietario"
            defaultChecked={temSegundoProprietario}
            className="accent-brand"
          />
          O cônjuge/segundo proprietário também precisa assinar
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Valor de anúncio</label>
            <CampoMoeda name="valor_imovel" defaultValue={a.valor_imovel} placeholder="500.000,00" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Comissão (%)</label>
            <input
              name="comissao_percentual"
              type="number"
              step="0.01"
              defaultValue={a.comissao_percentual ?? undefined}
              placeholder="6"
              className={campoClasse}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Prazo da autorização (dias)
          </label>
          <input
            name="prazo_dias"
            type="number"
            defaultValue={a.prazo_dias ?? 90}
            className={campoClasse}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="exclusividade"
            defaultChecked={a.exclusividade}
            className="accent-brand"
          />
          Com exclusividade
        </label>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Descrição do imóvel / Observações (opcional)
          </label>
          <textarea
            name="observacoes"
            rows={3}
            defaultValue={a.observacoes ?? ""}
            placeholder="Ex: taxa extra do PATE, R$ 280,00"
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
