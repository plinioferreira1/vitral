import Link from "next/link";

export const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  concluido: "Concluído",
  arquivado: "Arquivado",
  cancelado: "Cancelado",
};

export const STATUS_COR: Record<string, string> = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pendente: "bg-amber-50 text-amber-700 border-amber-100",
  concluido: "bg-stone-100 text-stone-600 border-stone-200",
  arquivado: "bg-stone-100 text-stone-500 border-stone-200",
  cancelado: "bg-rose-50 text-rose-700 border-rose-200",
};

export type ProcessoRow = {
  id: string;
  numero_processo: string;
  tipo: string | null;
  status: string;
  data_criacao: string;
  data_assinatura: string | null;
  data_final_contrato: string | null;
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

function formatarDataCurta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

export function TabelaProcessos({
  rows,
  ehFinanciamento,
  atrasosPorProcesso,
}: {
  rows: ProcessoRow[];
  ehFinanciamento: boolean;
  atrasosPorProcesso?: Map<string, number>;
}) {
  if (rows.length === 0) {
    return <p className="p-8 text-center text-sm text-ink-muted">Nenhum processo aqui.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
            <th className="w-8 px-5 py-3"></th>
            <th className="min-w-[160px] px-5 py-3 font-medium">Imóvel</th>
            {ehFinanciamento ? (
              <>
                <th className="min-w-[140px] px-5 py-3 font-medium">Cliente</th>
                <th className="min-w-[120px] px-5 py-3 font-medium">Valor financiado</th>
                <th className="min-w-[100px] px-5 py-3 font-medium">Indicação</th>
              </>
            ) : (
              <>
                <th className="min-w-[140px] px-5 py-3 font-medium">Comprador</th>
                <th className="min-w-[140px] px-5 py-3 font-medium">Vendedor</th>
              </>
            )}
            {ehFinanciamento && (
              <>
                <th className="min-w-[110px] px-5 py-3 font-medium">Modelo</th>
                <th className="min-w-[90px] px-5 py-3 font-medium">Banco</th>
              </>
            )}
            <th className="min-w-[100px] px-5 py-3 font-medium">Assinatura</th>
            <th className="min-w-[100px] px-5 py-3 font-medium">Prazo final</th>
            <th className="min-w-[90px] px-5 py-3 font-medium">Status</th>
            {atrasosPorProcesso && <th className="min-w-[90px] px-5 py-3 font-medium">Atrasos</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((p) => (
            <tr key={p.id} className="transition hover:bg-background">
              <td className="px-5 py-3">
                <input type="checkbox" name="ids" value={p.id} className="accent-brand" />
              </td>
              <td className="px-5 py-3">
                <Link href={`/processos/${p.id}`} className="hover:underline">
                  <span className="block whitespace-nowrap font-medium text-ink">
                    {p.imoveis?.endereco ?? "—"}
                  </span>
                  <span className="block font-mono text-xs text-ink-muted">{p.numero_processo}</span>
                </Link>
              </td>
              {ehFinanciamento ? (
                <>
                  <td className="px-5 py-3">
                    <Link
                      href={`/processos/${p.id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {p.comprador?.nome ?? "—"}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                    {p.valor_financiado
                      ? `R$ ${Number(p.valor_financiado).toLocaleString("pt-BR")}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{p.indicacao?.nome ?? "—"}</td>
                </>
              ) : (
                <>
                  <td className="px-5 py-3">
                    <Link
                      href={`/processos/${p.id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {p.comprador?.nome ?? "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{p.vendedor?.nome ?? "—"}</td>
                </>
              )}
              {ehFinanciamento && (
                <>
                  <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                    {p.modelos_processo?.nome ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{p.bancos?.nome ?? "—"}</td>
                </>
              )}
              <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                {formatarDataCurta(p.data_assinatura)}
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                {formatarDataCurta(p.data_final_contrato)}
              </td>
              <td className="whitespace-nowrap px-5 py-3">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COR[p.status]}`}
                >
                  {STATUS_LABEL[p.status]}
                </span>
              </td>
              {atrasosPorProcesso && (
                <td className="whitespace-nowrap px-5 py-3">
                  {(atrasosPorProcesso.get(p.id) ?? 0) > 0 ? (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                      {atrasosPorProcesso.get(p.id)} atraso
                      {(atrasosPorProcesso.get(p.id) ?? 0) > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
