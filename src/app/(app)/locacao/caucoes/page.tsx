import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { carregarCaucoes, type LinhaCaucao } from "@/lib/locacao/caucoes-relatorio";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";

export const metadata = { title: "Cauções da Locação | Vitral" };

const moeda = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

function Lista({ itens, vazio }: { itens: LinhaCaucao[]; vazio: string }) {
  if (itens.length === 0) return <p className="text-sm text-ink-muted">{vazio}</p>;
  return (
    <ul className="divide-y divide-border/60">
      {itens.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div className="min-w-0 flex-1 basis-64">
            <Link href={`/locacao/${c.id}#dados-contrato`} className="break-words text-sm font-medium text-brand hover:underline">
              {c.endereco || `Contrato ${c.numero ?? ""}`}
            </Link>
            <p className="text-xs text-ink-muted">
              {[c.locatario && `Locatário: ${c.locatario}`, c.numero && `Contrato ${c.numero}`, c.ativo ? `desde ${dataBR(c.vigencia_inicio)}` : `encerrado ${dataBR(c.data_encerramento ?? c.vigencia_fim)}`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-sm font-semibold tabular-nums text-ink">{c.caucao_valor_centavos ? moeda(c.caucao_valor_centavos) : "Valor não informado"}</p>
            <Link href={`/locacao/caucoes/${c.id}`} className="text-xs font-semibold text-brand hover:underline">Histórico de movimentações</Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Cauções contratuais previstas nos contratos de locação. O recebimento deve ser conferido no extrato. */
export default async function CaucoesPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const perms = await getPermissoesUsuario(supabase, user.id, usuario.nivel_acesso);
  if (!perms.temLocacao || perms.ehCorretor || perms.ehSocialMedia) redirect("/");

  const r = await carregarCaucoes(supabase, usuario.tenant_id);

  return (
    <div className="w-full min-w-0 space-y-5">
      <CabecalhoPagina
        titulo="Cauções da Locação"
        descricao="Contratos com garantia em caução e valores contratualmente previstos. Conferir depósitos e rendimentos bancários."
        acao={
          <a href="/locacao/caucoes/csv" download className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-ink hover:bg-background">
            <Download size={15} aria-hidden="true" /> Baixar planilha
          </a>
        }
      />

      <section className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
        <p className="text-sm text-ink-muted">Total contratual de cauções ativas</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-ink">{moeda(r.totalCentavos)}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {r.ativos.length} contrato(s) ativo(s) com caução · depósito e saldo precisam de conciliação bancária
          {r.semValor.length > 0 && <span className="font-semibold text-amber-800"> · {r.semValor.length} sem valor informado (fora do total)</span>}
        </p>
      </section>

      <section className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5" aria-labelledby="ativos">
        <h2 id="ativos" className="mb-2 text-sm font-semibold text-ink">Contratos ativos · valores previstos</h2>
        <Lista itens={r.ativos} vazio="Nenhum contrato ativo com caução. Para marcar, abra o contrato, edite os dados e escolha “Caução” na garantia." />
      </section>

      {r.encerrados.length > 0 && (
        <details className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Contratos encerrados com caução ({r.encerrados.length})</summary>
          <p className="mt-2 text-xs text-ink-muted">Fora do total dos contratos ativos. Confira os depósitos, os rendimentos e as devoluções.</p>
          <div className="mt-2"><Lista itens={r.encerrados} vazio="" /></div>
        </details>
      )}
    </div>
  );
}
