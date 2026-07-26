import { createClient } from "@/lib/supabase/server";
import { NovoProcessoForm } from "./form";

export default async function NovoProcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const supabase = await createClient();
  const { erro } = await searchParams;

  const [modelos, clientes, imoveis, bancos, corretores, usuarios] = await Promise.all([
    supabase.from("modelos_processo").select("id, nome, descricao").eq("ativo", true).order("nome"),
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("imoveis").select("id, endereco").order("endereco"),
    supabase.from("bancos").select("id, nome").order("nome"),
    supabase.from("corretores").select("id, nome").order("nome"),
    supabase.from("usuarios").select("id, nome").order("nome"),
  ]);

  const modelosComEtapas = await Promise.all(
    (modelos.data ?? []).map(async (m) => {
      const { data: etapas } = await supabase
        .from("modelos_etapa")
        .select("*")
        .eq("modelo_processo_id", m.id)
        .order("ordem", { ascending: true });
      return { ...m, etapas: etapas ?? [] };
    })
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Novo processo</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Escolha um modelo e as etapas são geradas automaticamente com as datas previstas.
        </p>
      </div>

      {erro && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {erro}
        </p>
      )}

      <NovoProcessoForm
        modelos={modelosComEtapas}
        clientes={clientes.data ?? []}
        imoveis={imoveis.data ?? []}
        bancos={bancos.data ?? []}
        corretores={corretores.data ?? []}
        usuarios={usuarios.data ?? []}
      />
    </div>
  );
}
