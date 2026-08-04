import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
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

      <form action={criarAutorizacao} className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Imóvel</label>
          <input
            name="imovel"
            required
            placeholder="Endereço do imóvel"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Proprietário</label>
          <input
            name="vendedor"
            required
            placeholder="Nome completo"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="segundo_proprietario" className="accent-brand" />
          Tem um segundo proprietário (ex: cônjuge) que também precisa assinar
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Valor do imóvel</label>
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
            Observações (opcional)
          </label>
          <textarea
            name="observacoes"
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Criar autorização
        </button>
      </form>
    </div>
  );
}
