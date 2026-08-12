import { createClient } from "@/lib/supabase/server";
import { criarContratoLocacao } from "./actions";
import { VoltarLink } from "@/components/voltar-link";
import { BotaoSubmit } from "@/components/botao-submit";

export default async function NovoContratoLocacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const supabase = await createClient();
  const { erro } = await searchParams;

  const [imoveis, clientes] = await Promise.all([
    supabase.from("imoveis").select("id, endereco").order("endereco"),
    supabase.from("clientes").select("id, nome").order("nome"),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <VoltarLink href="/locacao" label="Locação" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Novo contrato de locação</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Depois de criar, você vai poder marcar o status de cada conta (IPTU e condomínio) mês a
          mês.
        </p>
      </div>

      {erro && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {erro}
        </p>
      )}

      <form
        action={criarContratoLocacao}
        className="space-y-4 rounded-xl border border-border/60 bg-surface shadow-sm p-6"
      >
        <CampoTexto
          label="Imóvel"
          name="imovel"
          listId="lista-imoveis"
          placeholder="Endereço do imóvel"
        />

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Locador
          </p>
          <div className="space-y-3">
            <CampoTexto label="Nome" name="locador" listId="lista-clientes" placeholder="Nome do locador" />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="locador_telefone"
                placeholder="Telefone"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <input
                name="locador_email"
                type="email"
                placeholder="E-mail"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Locatário
          </p>
          <div className="space-y-3">
            <CampoTexto
              label="Nome"
              name="locatario"
              listId="lista-clientes"
              placeholder="Nome do locatário"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="locatario_telefone"
                placeholder="Telefone"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <input
                name="locatario_email"
                type="email"
                placeholder="E-mail"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="emite_nf" defaultChecked className="accent-brand" />
          Emite nota fiscal
        </label>

        <BotaoSubmit className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90">
          Criar contrato
        </BotaoSubmit>
      </form>

      <datalist id="lista-imoveis">
        {(imoveis.data ?? []).map((i) => (
          <option key={i.id} value={i.endereco} />
        ))}
      </datalist>
      <datalist id="lista-clientes">
        {(clientes.data ?? []).map((c) => (
          <option key={c.id} value={c.nome} />
        ))}
      </datalist>
    </div>
  );
}

function CampoTexto({
  label,
  name,
  listId,
  placeholder,
}: {
  label: string;
  name: string;
  listId: string;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-muted">{label}</label>
      <input
        name={name}
        list={listId}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
      <p className="mt-1 text-[11px] text-ink-muted">Digite ou escolha um já cadastrado</p>
    </div>
  );
}
