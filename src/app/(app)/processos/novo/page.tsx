import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NovoProcessoForm } from "./form";
import type { CategoriaProcesso } from "@/lib/types";
import { VoltarLink } from "@/components/voltar-link";

export default async function NovoProcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const supabase = await createClient();
  const { erro } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meuUsuario } = await supabase
    .from("usuarios")
    .select("nivel_acesso")
    .eq("id", user.id)
    .single();

  const vejoTudo = meuUsuario?.nivel_acesso === "diretor" || meuUsuario?.nivel_acesso === "gerente";

  let minhasCategorias: CategoriaProcesso[] = ["venda", "financiamento", "locacao"];
  if (!vejoTudo) {
    const { data: categoriasRaw } = await supabase
      .from("usuario_categorias")
      .select("categoria")
      .eq("usuario_id", user.id);
    minhasCategorias = (categoriasRaw ?? []).map((c) => c.categoria as CategoriaProcesso);
  }

  const [modelos, clientes, imoveis, bancos, corretores, usuarios, etapasPadrao] = await Promise.all([
    supabase.from("modelos_processo").select("id, nome, descricao, categoria").eq("ativo", true).order("nome"),
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("imoveis").select("id, endereco").order("endereco"),
    supabase.from("bancos").select("id, nome").order("nome"),
    supabase.from("corretores").select("id, nome").order("nome"),
    supabase.from("usuarios").select("id, nome").order("nome"),
    supabase.from("etapas_padrao").select("id, nome, ordem, categoria").order("ordem", { ascending: true }),
  ]);

  const modelosPermitidos = (modelos.data ?? []).filter((m) =>
    minhasCategorias.includes(m.categoria as CategoriaProcesso)
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <VoltarLink href="/processos" label="Processos" />
        <h1 className="text-xl font-serif font-bold uppercase tracking-wide text-ink">Novo processo</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Escolha um modelo e marque quais etapas fazem parte desse processo específico.
        </p>
      </div>

      {erro && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {erro}
        </p>
      )}

      {modelosPermitidos.length === 0 ? (
        <p className="rounded-md border border-border bg-surface p-5 text-sm text-ink-muted">
          Você não tem permissão pra criar processos em nenhuma categoria. Fale com um
          administrador.
        </p>
      ) : (
        <NovoProcessoForm
          modelos={modelosPermitidos}
          etapasPadrao={etapasPadrao.data ?? []}
          clientes={clientes.data ?? []}
          imoveis={imoveis.data ?? []}
          bancos={bancos.data ?? []}
          corretores={corretores.data ?? []}
          usuarios={usuarios.data ?? []}
        />
      )}
    </div>
  );
}
