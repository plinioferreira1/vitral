import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIA_LABEL } from "@/lib/types";
import { Search } from "lucide-react";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = (q ?? "").trim();
  const supabase = await createClient();

  let resultados: {
    id: string;
    numero_processo: string;
    categoria: string;
    imoveis: { endereco: string } | null;
    comprador: { nome: string } | null;
    vendedor: { nome: string } | null;
  }[] = [];

  if (termo.length >= 2) {
    // Busca por endereço do imóvel primeiro (é o caso mais comum),
    // depois por nome de comprador/vendedor — junta os resultados.
    const { data: porImovel } = await supabase
      .from("processos")
      .select(
        "id, numero_processo, categoria, imoveis!inner ( endereco ), comprador:clientes!processos_comprador_id_fkey ( nome ), vendedor:clientes!processos_vendedor_id_fkey ( nome )"
      )
      .ilike("imoveis.endereco", `%${termo}%`)
      .limit(20);

    const { data: idsComprador } = await supabase
      .from("clientes")
      .select("id")
      .ilike("nome", `%${termo}%`);

    const idsClientes = (idsComprador ?? []).map((c) => c.id);
    const { data: porCliente } =
      idsClientes.length > 0
        ? await supabase
            .from("processos")
            .select(
              "id, numero_processo, categoria, imoveis ( endereco ), comprador:clientes!processos_comprador_id_fkey ( nome ), vendedor:clientes!processos_vendedor_id_fkey ( nome )"
            )
            .or(`comprador_id.in.(${idsClientes.join(",")}),vendedor_id.in.(${idsClientes.join(",")})`)
            .limit(20)
        : { data: [] };

    const combinados = [...(porImovel ?? []), ...(porCliente ?? [])] as unknown as typeof resultados;
    const vistos = new Set<string>();
    resultados = combinados.filter((r) => {
      if (vistos.has(r.id)) return false;
      vistos.add(r.id);
      return true;
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Busca</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {termo ? (
            <>
              Resultados pra <span className="font-medium text-ink">&ldquo;{termo}&rdquo;</span>
            </>
          ) : (
            "Digite um imóvel, comprador ou vendedor na barra de busca no topo."
          )}
        </p>
      </div>

      {termo.length >= 2 && resultados.length === 0 && (
        <div className="rounded-xl border border-border/60 bg-surface p-8 text-center shadow-sm">
          <Search size={24} className="mx-auto mb-2 text-ink-muted" />
          <p className="text-sm text-ink-muted">Nada encontrado pra essa busca.</p>
        </div>
      )}

      {resultados.length > 0 && (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
          {resultados.map((r) => (
            <Link
              key={r.id}
              href={`/processos/${r.id}`}
              className="flex items-center justify-between gap-3 p-4 transition hover:bg-background"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {r.imoveis?.endereco ?? r.numero_processo}
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {r.comprador?.nome ?? "—"} / {r.vendedor?.nome ?? "—"}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-xs text-ink-muted">
                {CATEGORIA_LABEL[r.categoria as keyof typeof CATEGORIA_LABEL] ?? r.categoria}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
