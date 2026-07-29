import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { alternarTarefaMensal } from "./actions";
import { TIPO_CONTA_LABEL } from "@/lib/types";

function primeiroDiaDoMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function LocacaoPage() {
  const supabase = await createClient();
  const competenciaAtual = primeiroDiaDoMes();

  const { data: contratos } = await supabase
    .from("contratos_locacao")
    .select(
      `id, numero, ativo,
       imoveis ( endereco ),
       locador:clientes!contratos_locacao_locador_id_fkey ( nome ),
       locatario:clientes!contratos_locacao_locatario_id_fkey ( nome )`
    )
    .order("numero", { ascending: true });

  const { data: contasPendentesRaw } = await supabase
    .from("contas_locacao")
    .select("id, tipo, status, competencia, contrato_id, vencimento")
    .eq("status", "pendente")
    .order("vencimento", { ascending: true, nullsFirst: true });

  type ContaPendente = {
    id: string;
    tipo: import("@/lib/types").TipoContaLocacao;
    status: string;
    competencia: string;
    contrato_id: string;
    vencimento: string | null;
  };
  const contasPendentes = (contasPendentesRaw ?? []) as ContaPendente[];

  const { data: tarefas } = await supabase
    .from("tarefas_mensais")
    .select("id, nome, regra, ordem")
    .order("ordem", { ascending: true });

  const { data: tarefasStatus } = await supabase
    .from("tarefas_mensais_status")
    .select("id, tarefa_id, competencia, concluida")
    .eq("competencia", competenciaAtual);

  type ContratoRow = {
    id: string;
    numero: string;
    ativo: boolean;
    imoveis: { endereco: string } | null;
    locador: { nome: string } | null;
    locatario: { nome: string } | null;
  };
  const listaContratos = (contratos ?? []) as unknown as ContratoRow[];

  const contratosPorId = new Map(listaContratos.map((c) => [c.id, c]));
  const totalContratosAtivos = listaContratos.filter((c) => c.ativo).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif font-bold uppercase tracking-wide text-ink">Locação</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {totalContratosAtivos} contratos ativos · {contasPendentes.length} contas
            pendentes
          </p>
        </div>
        <Link
          href="/locacao/novo"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo contrato
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="mb-3 text-sm font-semibold text-ink">Tarefas do mês</p>
        <div className="space-y-2">
          {(tarefas ?? []).map((t) => {
            const statusExistente = (tarefasStatus ?? []).find((s) => s.tarefa_id === t.id);
            const concluida = statusExistente?.concluida ?? false;
            return (
              <form key={t.id} action={alternarTarefaMensal}>
                <input type="hidden" name="tarefa_id" value={t.id} />
                <input type="hidden" name="competencia" value={competenciaAtual} />
                <input type="hidden" name="concluida_atual" value={String(concluida)} />
                {statusExistente && <input type="hidden" name="status_id" value={statusExistente.id} />}
                <button type="submit" className="flex w-full items-center gap-2.5 text-left text-sm">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                      concluida ? "border-brand bg-brand text-white" : "border-border bg-surface"
                    }`}
                  >
                    {concluida ? "✓" : ""}
                  </span>
                  <span className={concluida ? "text-ink-muted line-through" : "text-ink"}>
                    {t.nome}
                  </span>
                  {t.regra && <span className="text-xs text-ink-muted">· {t.regra}</span>}
                </button>
              </form>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="mb-3 text-sm font-semibold text-ink">Contas pendentes</p>
        {contasPendentes.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma conta pendente no momento. 🎉</p>
        ) : (
          <ul className="divide-y divide-border">
            {contasPendentes.slice(0, 15).map((c) => {
              const contrato = contratosPorId.get(c.contrato_id);
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link href={`/locacao/${c.contrato_id}`} className="hover:underline">
                    <span className="font-medium text-ink">
                      {contrato?.imoveis?.endereco ?? contrato?.numero ?? "—"}
                    </span>
                    <span className="text-ink-muted"> — {TIPO_CONTA_LABEL[c.tipo]}</span>
                  </Link>
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                    {new Date(c.competencia + "T00:00:00").toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {listaContratos.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            Nenhum contrato ainda.{" "}
            <Link href="/locacao/novo" className="text-brand hover:underline">
              Criar o primeiro
            </Link>
            .
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                <th className="px-5 py-3 font-medium">Nº</th>
                <th className="px-5 py-3 font-medium">Imóvel</th>
                <th className="px-5 py-3 font-medium">Locador</th>
                <th className="px-5 py-3 font-medium">Locatário</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listaContratos.map((c) => (
                <tr key={c.id} className="transition hover:bg-background">
                  <td className="px-5 py-3 font-mono text-xs text-ink-muted">
                    <Link href={`/locacao/${c.id}`} className="hover:underline">
                      {c.numero}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/locacao/${c.id}`} className="font-medium text-ink hover:underline">
                      {c.imoveis?.endereco ?? "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{c.locador?.nome ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-muted">{c.locatario?.nome ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        c.ativo
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : "border-stone-200 bg-stone-100 text-stone-500"
                      }`}
                    >
                      {c.ativo ? "Ativo" : "Encerrado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
