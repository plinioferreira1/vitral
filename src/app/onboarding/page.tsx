import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { criarOrganizacao } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (usuario?.tenant_id) redirect("/");

  const { erro } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-ink">Bem-vindo(a) ao Vitral</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Antes de começar, crie a organização da sua imobiliária. Depois disso você
            poderá convidar a diretora e os demais gerentes para o mesmo espaço de
            trabalho, com os mesmos dados.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          {erro && (
            <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {erro}
            </p>
          )}
          <form action={criarOrganizacao} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Nome da imobiliária
              </label>
              <input
                name="nome_empresa"
                required
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="Ex: Imobiliária Silva & Associados"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-brand py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Criar organização
            </button>
          </form>
          <p className="mt-3 text-xs text-ink-muted">
            Isso já cria os modelos de processo padrão: Venda Financiada, Locação,
            Correspondente Bancário e Registro de Imóvel.
          </p>
        </div>
      </div>
    </div>
  );
}
