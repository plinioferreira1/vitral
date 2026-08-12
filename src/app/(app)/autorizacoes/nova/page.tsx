import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import { BotaoSubmit } from "@/components/botao-submit";
import { REGIOES_ADMINISTRATIVAS_DF } from "@/lib/circunscricoes-df";
import { criarAutorizacao } from "../actions";

export default function NovaAutorizacaoPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <VoltarLink href="/autorizacoes" label="Autorizações" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Nova autorização de venda</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Depois de criar, você vai poder copiar o link de assinatura de cada proprietário, ou
          passar o celular/tablet pra assinarem na hora.
        </p>
      </div>

      <form action={criarAutorizacao} className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Proprietário(a)
          </p>
          <div className="space-y-3">
            <input
              name="vendedor_nome"
              required
              placeholder="Nome completo"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="vendedor_cpf"
                placeholder="CPF"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <input
                name="vendedor_rg"
                placeholder="RG"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="vendedor_telefone"
                placeholder="Telefone"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <input
                name="vendedor_endereco"
                placeholder="Endereço"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        </div>

        <details className="group">
          <summary className="cursor-pointer select-none text-xs font-medium text-brand">
            + Adicionar cônjuge / segundo proprietário
          </summary>
          <div className="mt-3 space-y-3">
            <input
              name="conjuge_nome"
              placeholder="Nome completo"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="conjuge_cpf"
                placeholder="CPF"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <input
                name="conjuge_rg"
                placeholder="RG"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="conjuge_telefone"
                placeholder="Telefone"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <input
                name="conjuge_endereco"
                placeholder="Endereço"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
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
              placeholder="Endereço completo do imóvel"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Região Administrativa
              </label>
              <input
                name="regiao_administrativa"
                required
                list="regioes-administrativas"
                placeholder="Ex: Águas Claras"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
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
                placeholder="CEP"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <input
                name="matricula"
                placeholder="Matrícula"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="area_construida"
                placeholder="Área construída (m²)"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <input
                name="area_lote"
                placeholder="Área do lote (m²)"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="inscricao_iptu"
                placeholder="Inscrição de IPTU"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <CampoMoeda name="valor_condominio" placeholder="Condomínio (R$)" />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="segundo_proprietario" className="accent-brand" />
          O cônjuge/segundo proprietário também precisa assinar
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Valor de anúncio</label>
            <CampoMoeda name="valor_imovel" placeholder="500.000,00" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Comissão (%)</label>
            <input
              name="comissao_percentual"
              type="number"
              step="0.01"
              placeholder="6"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
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
            defaultValue={90}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="exclusividade" className="accent-brand" />
          Com exclusividade
        </label>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Descrição do imóvel / Observações (opcional)
          </label>
          <textarea
            name="observacoes"
            rows={3}
            placeholder="Ex: taxa extra do PATE, R$ 280,00"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <BotaoSubmit className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Criar autorização
        </BotaoSubmit>
      </form>
    </div>
  );
}
