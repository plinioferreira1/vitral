import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import { CampoCPF } from "@/components/campo-cpf";
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
    `${INPUT_CLASS} min-h-11 text-base sm:text-sm`;

  return (
    <div className="mx-auto w-full min-w-0 space-y-6">
      <div>
        <VoltarLink href={`/autorizacoes/${id}`} label="Autorização" />
        <CabecalhoPagina titulo="Editar autorização de venda" descricao={<>Só é possível editar enquanto nenhum proprietário tiver assinado.</>} />
      </div>

      <form
        action={atualizarAutorizacao}
        className={`${CARD_CLASS} space-y-6 p-5 sm:p-7`}
      >
        <input type="hidden" name="id" value={a.id} />

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Proprietário(a)
          </p>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Nome completo do proprietário</span><input id="vendedor_nome"
              name="vendedor_nome"
              required
              defaultValue={a.vendedor?.nome ?? ""}
              placeholder="Nome completo"
              className={campoClasse}
            /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">CPF do proprietário</span><CampoCPF id="vendedor_cpf"
                name="vendedor_cpf"
                defaultValue={a.vendedor?.cpf_cnpj ?? ""}
                className={campoClasse}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">RG do proprietário</span><input id="vendedor_rg"
                name="vendedor_rg"
                defaultValue={a.vendedor?.rg ?? ""}
                placeholder="RG"
                className={campoClasse}
              /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Telefone do proprietário</span><input type="tel" id="vendedor_telefone"
                name="vendedor_telefone"
                defaultValue={a.vendedor?.telefone ?? ""}
                placeholder="Telefone"
                className={campoClasse}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Endereço do proprietário</span><input id="vendedor_endereco"
                name="vendedor_endereco"
                defaultValue={a.vendedor?.endereco ?? ""}
                placeholder="Endereço"
                className={campoClasse}
              /></label>
            </div>
          </div>
        </div>

        <details className="group rounded-xl border border-border bg-background/50 p-4" open={!!a.conjuge || temSegundoProprietario}>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-brand">
            + Adicionar cônjuge / segundo proprietário
          </summary>
          <div className="mt-3 space-y-3">
            <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Nome completo do segundo proprietário</span><input id="conjuge_nome"
              name="conjuge_nome"
              defaultValue={a.conjuge?.nome ?? ""}
              placeholder="Nome completo"
              className={campoClasse}
            /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">CPF do segundo proprietário</span><CampoCPF id="conjuge_cpf"
                name="conjuge_cpf"
                defaultValue={a.conjuge?.cpf_cnpj ?? ""}
                className={campoClasse}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">RG do segundo proprietário</span><input id="conjuge_rg"
                name="conjuge_rg"
                defaultValue={a.conjuge?.rg ?? ""}
                placeholder="RG"
                className={campoClasse}
              /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Telefone do segundo proprietário</span><input type="tel" id="conjuge_telefone"
                name="conjuge_telefone"
                defaultValue={a.conjuge?.telefone ?? ""}
                placeholder="Telefone"
                className={campoClasse}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Endereço do segundo proprietário</span><input id="conjuge_endereco"
                name="conjuge_endereco"
                defaultValue={a.conjuge?.endereco ?? ""}
                placeholder="Endereço"
                className={campoClasse}
              /></label>
            </div>
          </div>
        </details>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Imóvel</p>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Endereço do imóvel</span><input id="imovel"
              name="imovel"
              required
              defaultValue={a.imoveis?.endereco ?? ""}
              placeholder="Endereço completo do imóvel"
              className={campoClasse}
            /></label>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="regiao_administrativa">
                Região Administrativa
              </label>
              <input id="regiao_administrativa"
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
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">CEP</span><input id="cep"
                name="cep"
                defaultValue={a.imoveis?.cep ?? ""}
                placeholder="CEP"
                className={campoClasse}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Matrícula</span><input id="matricula"
                name="matricula"
                defaultValue={a.imoveis?.matricula ?? ""}
                placeholder="Matrícula"
                className={campoClasse}
              /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Área construída (m²)</span><input id="area_construida"
                name="area_construida"
                defaultValue={a.imoveis?.area_construida ?? ""}
                placeholder="Área construída (m²)"
                className={campoClasse}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Área do lote (m²)</span><input id="area_lote"
                name="area_lote"
                defaultValue={a.imoveis?.area_lote ?? ""}
                placeholder="Área do lote (m²)"
                className={campoClasse}
              /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Inscrição de IPTU</span><input id="inscricao_iptu"
                name="inscricao_iptu"
                defaultValue={a.imoveis?.inscricao_iptu ?? ""}
                placeholder="Inscrição de IPTU"
                className={campoClasse}
              /></label>
              <label className="block text-sm font-medium text-ink"><span className="mb-1.5 block">Condomínio mensal</span><CampoMoeda id="valor_condominio"
                name="valor_condominio"
                defaultValue={a.imoveis?.valor_condominio ?? null}
                placeholder="Condomínio (R$)"
              className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`} /></label>
            </div>
          </div>
        </div>

        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background/50 p-3 text-sm text-ink">
          <input
            type="checkbox"
            name="segundo_proprietario"
            defaultChecked={temSegundoProprietario}
            className="h-4 w-4 shrink-0 accent-brand"
          />
          O cônjuge/segundo proprietário também precisa assinar
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="valor_imovel">Valor de anúncio</label>
            <CampoMoeda id="valor_imovel" name="valor_imovel" defaultValue={a.valor_imovel} placeholder="500.000,00" className={`${INPUT_CLASS} min-h-11 text-base sm:text-sm`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="comissao_percentual">Comissão (%)</label>
            <input id="comissao_percentual"
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
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="prazo_dias">
            Prazo da autorização (dias)
          </label>
          <input id="prazo_dias"
            name="prazo_dias"
            type="number"
            defaultValue={a.prazo_dias ?? 90}
            className={campoClasse}
          />
        </div>

        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background/50 p-3 text-sm text-ink">
          <input
            type="checkbox"
            name="exclusividade"
            defaultChecked={a.exclusividade}
            className="h-4 w-4 shrink-0 accent-brand"
          />
          Com exclusividade
        </label>

        <div>
          <label htmlFor="observacoes" className="mb-1 block text-xs font-medium text-ink-muted">
            Descrição do imóvel / Observações (opcional)
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            defaultValue={a.observacoes ?? ""}
            placeholder="Ex: taxa extra do PATE, R$ 280,00"
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
