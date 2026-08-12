import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import { BotaoSubmit } from "@/components/botao-submit";
import { hojeISO } from "@/lib/data-br";
import { criarTermoVisita } from "../actions";

export default function NovoTermoVisitaPage() {
  const hoje = hojeISO();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <VoltarLink href="/termos-visita" label="Termos de Visita" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Novo termo de visita</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Depois de criar, você vai poder copiar o link de assinatura, ou passar o
          celular/tablet pro cliente assinar na hora, ao fim da visita.
        </p>
      </div>

      <form
        action={criarTermoVisita}
        className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-sm"
      >
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Imóvel visitado
          </p>
          <div className="space-y-3">
            <input
              name="imovel"
              required
              placeholder="Endereço do imóvel"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="codigo_imovel"
                placeholder="Código do imóvel (opcional)"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <CampoMoeda name="valor_imovel" placeholder="Valor do imóvel" />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Cliente
          </p>
          <div className="space-y-3">
            <input
              name="cliente_nome"
              required
              placeholder="Nome completo"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="cliente_telefone"
                placeholder="Telefone"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <input
                name="cliente_email"
                type="email"
                placeholder="E-mail (opcional)"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Corretor responsável
            </label>
            <input
              name="corretor_nome"
              placeholder="Nome do corretor"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Data da visita</label>
            <input
              name="data_visita"
              type="date"
              defaultValue={hoje}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Multa por descumprimento (%)
          </label>
          <input
            name="multa_percentual"
            type="number"
            step="0.01"
            defaultValue={6}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <p className="mt-1 text-[11px] text-ink-muted">
            Percentual cobrado do cliente caso ele feche o negócio por fora, sem a Sacra — 6% é o
            padrão usado no modelo atual.
          </p>
        </div>

        <BotaoSubmit className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Criar termo de visita
        </BotaoSubmit>
      </form>
    </div>
  );
}
