import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaProcesso } from "@/lib/types";
import { CATEGORIA_LABEL } from "@/lib/types";
import { getEventosCalendario } from "@/lib/queries";
import { ResumoPrazos } from "@/components/resumo-prazos";

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  concluido: "Concluído",
  arquivado: "Arquivado",
  cancelado: "Cancelado",
};

const STATUS_COR: Record<string, string> = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pendente: "bg-amber-50 text-amber-700 border-amber-100",
  concluido: "bg-stone-100 text-stone-600 border-stone-200",
  arquivado: "bg-stone-100 text-stone-500 border-stone-200",
  cancelado: "bg-rose-50 text-rose-700 border-rose-200",
};

type Row = {
  id: string;
  numero_processo: string;
  tipo: string | null;
  status: string;
  data_criacao: string;
  valor_total: number | null;
  valor_financiado: number | null;
  origem: string | null;
  imoveis: { endereco: string } | null;
  comprador: { nome: string } | null;
  vendedor: { nome: string } | null;
  corretores: { nome: string } | null;
  bancos: { nome: string } | null;
  indicacao: { nome: string } | null;
  modelos_processo: { nome: string } | null;
};

function TabelaProcessos({ rows, ehFinanciamento }: { rows: Row[]; ehFinanciamento: boolean }) {
  if (rows.length === 0) {
    return <p className="p-8 text-center text-sm text-ink-muted">Nenhum processo aqui.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
          <th className="px-5 py-3 font-medium">Imóvel</th>
          {ehFinanciamento ? (
            <>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Valor financiado</th>
              <th className="px-5 py-3 font-medium">Indicação</th>
            </>
          ) : (
            <>
              <th className="px-5 py-3 font-medium">Comprador</th>
              <th className="px-5 py-3 font-medium">Vendedor</th>
            </>
          )}
          <th className="px-5 py-3 font-medium">Modelo</th>
          <th className="px-5 py-3 font-medium">Banco</th>
          <th className="px-5 py-3 font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((p) => (
          <tr key={p.id} className="transition hover:bg-background">
            <td className="px-5 py-3">
              <Link href={`/processos/${p.id}`} className="hover:underline">
                <span className="block font-medium text-ink">{p.imoveis?.endereco ?? "—"}</span>
                <span className="block font-mono text-xs text-ink-muted">{p.numero_processo}</span>
              </Link>
            </td>
            {ehFinanciamento ? (
              <>
                <td className="px-5 py-3">
                  <Link href={`/processos/${p.id}`} className="font-medium text-ink hover:underline">
                    {p.comprador?.nome ?? "—"}
                  </Link>
                </td>
                <td className="px-5 py-3 text-ink-muted">
                  {p.valor_financiado
                    ? `R$ ${Number(p.valor_financiado).toLocaleString("pt-BR")}`
                    : "—"}
                </td>
                <td className="px-5 py-3 text-ink-muted">{p.indicacao?.nome ?? "—"}</td>
              </>
            ) : (
              <>
                <td className="px-5 py-3">
                  <Link href={`/processos/${p.id}`} className="font-medium text-ink hover:underline">
                    {p.comprador?.nome ?? "—"}
                  </Link>
                </td>
                <td className="px-5 py-3 text-ink-muted">{p.vendedor?.nome ?? "—"}</td>
              </>
            )}
            <td className="px-5 py-3 text-ink-muted">{p.modelos_processo?.nome ?? "—"}</td>
            <td className="px-5 py-3 text-ink-muted">{p.bancos?.nome ?? "—"}</td>
            <td className="px-5 py-3">
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COR[p.status]}`}
              >
                {STATUS_LABEL[p.status]}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: categoriaParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: meuUsuario } = await supabase
    .from("usuarios")
    .select("nivel_acesso")
    .eq("id", user?.id ?? "")
    .single();

  const vejoTudo = meuUsuario?.nivel_acesso === "diretor" || meuUsuario?.nivel_acesso === "gerente" || meuUsuario?.nivel_acesso === "auxiliar";

  let abasPermitidas: CategoriaProcesso[] = ["venda", "financiamento"];
  if (!vejoTudo) {
    const { data: categoriasRaw } = await supabase
      .from("usuario_categorias")
      .select("categoria")
      .eq("usuario_id", user?.id ?? "");
    const minhas = new Set((categoriasRaw ?? []).map((c) => c.categoria));
    abasPermitidas = abasPermitidas.filter((c) => minhas.has(c));
  }

  const categoria = (categoriaParam as CategoriaProcesso) || abasPermitidas[0] || "venda";

  const { data: processos, error } = await supabase
    .from("processos")
    .select(
      `id, numero_processo, tipo, status, data_criacao, valor_total, valor_financiado, origem,
       imoveis ( endereco ),
       comprador:clientes!processos_comprador_id_fkey ( nome ),
       vendedor:clientes!processos_vendedor_id_fkey ( nome ),
       corretores!processos_corretor_id_fkey ( nome ), bancos ( nome ),
       indicacao:corretores!processos_indicacao_id_fkey ( nome ),
       modelos_processo ( nome )`
    )
    .eq("categoria", categoria)
    .order("criado_em", { ascending: false });

  if (error) {
    return <p className="text-sm text-rose-700">Erro ao carregar processos: {error.message}</p>;
  }

  const rows = (processos ?? []) as unknown as Row[];
  const emAndamento = rows.filter((p) => p.status !== "concluido" && p.status !== "cancelado");
  const concluidos = rows.filter((p) => p.status === "concluido" || p.status === "cancelado");
  const ehFinanciamento = categoria === "financiamento";

  const eventos = (await getEventosCalendario()).filter((e) => e.categoria === categoria);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {CATEGORIA_LABEL[categoria]}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{rows.length} processos nessa categoria</p>
        </div>
        <Link
          href="/processos/novo"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo processo
        </Link>
      </div>

      <ResumoPrazos eventos={eventos} hrefEmAberto={`/calendario?categoria=${categoria}`} />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
        {emAndamento.length === 0 && concluidos.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            Nenhum processo nessa categoria ainda.{" "}
            <Link href="/processos/novo" className="text-brand hover:underline">
              Criar o primeiro
            </Link>
            .
          </p>
        ) : (
          <TabelaProcessos rows={emAndamento} ehFinanciamento={ehFinanciamento} />
        )}
      </div>

      {concluidos.length > 0 && (
        <details className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
          <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-ink-muted hover:text-ink">
            {concluidos.length} processo{concluidos.length > 1 ? "s" : ""} concluído
            {concluidos.length > 1 ? "s" : ""} ou cancelado{concluidos.length > 1 ? "s" : ""}
          </summary>
          <div className="border-t border-border">
            <TabelaProcessos rows={concluidos} ehFinanciamento={ehFinanciamento} />
          </div>
        </details>
      )}
    </div>
  );
}
