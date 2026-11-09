import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { NavegacaoContexto } from "@/components/navegacao-contexto";
import { CARD_CLASS, INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";

type ProcessoFonte = {
  status: string | null;
  situacao_comercial: string | null;
  fonte_lead: string | null;
  mes_venda: string | null;
  data_venda: string | null;
  data_assinatura: string | null;
  data_conclusao: string | null;
  data_criacao: string | null;
};
type HistoricoFonte = { mes_venda: string; fonte_lead: string | null };
const fonteNormalizada = (valor: string | null) =>
  !valor?.trim() || valor.trim().toLocaleLowerCase("pt-BR") === "indefinido"
    ? "Não informado"
    : valor.trim();
const mesProcesso = (v: ProcessoFonte) =>
  v.mes_venda ?? v.data_venda?.slice(0, 7) ?? v.data_assinatura?.slice(0, 7) ??
  v.data_conclusao?.slice(0, 7) ?? v.data_criacao?.slice(0, 7) ?? "";
const percentual = (n: number, total: number) =>
  total ? (100 * n / total).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%" : "0%";

export default async function ResultadosPorFontePage({ searchParams }: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const { usuario } = await getUsuarioAtual();
  if (!usuario?.tenant_id) redirect("/login");
  if (!["diretor", "gerente"].includes(usuario.nivel_acesso)) redirect("/vendas");

  const params = await searchParams;
  const ano = /^20\d{2}$/.test(params.ano ?? "") ? params.ano! : "2026";
  const mes = /^(0[1-9]|1[0-2])$/.test(params.mes ?? "") ? params.mes! : "";
  const inicio = mes ? `${ano}-${mes}` : ano;
  const supabase = await createClient();
  const [rProcessos, rHistoricos] = await Promise.all([
    supabase.from("processos")
      .select("status,situacao_comercial,fonte_lead,mes_venda,data_venda,data_assinatura,data_conclusao,data_criacao")
      .eq("tenant_id", usuario.tenant_id).eq("categoria", "venda"),
    supabase.from("vendas_fontes_historicas")
      .select("mes_venda,fonte_lead")
      .eq("tenant_id", usuario.tenant_id),
  ]);
  if (rProcessos.error || rHistoricos.error) return (
    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
      Não foi possível carregar os resultados: {rProcessos.error?.message || rHistoricos.error?.message}
    </p>
  );

  // Mesma regra comercial da planilha: venda assinada, mesmo com processo em andamento.
  // Processos apenas cadastrados, sem assinatura ou confirmação comercial, não entram.
  const processos = (rProcessos.data ?? []) as unknown as ProcessoFonte[];
  const historicos = (rHistoricos.data ?? []) as unknown as HistoricoFonte[];
  const fontes = [
    ...processos
      .filter(p => (!!p.situacao_comercial || !!p.data_assinatura || !!p.data_venda) && mesProcesso(p).startsWith(inicio))
      .map(p => fonteNormalizada(p.fonte_lead)),
    ...historicos.filter(h => h.mes_venda.startsWith(inicio)).map(h => fonteNormalizada(h.fonte_lead)),
  ];
  const total = fontes.length;
  const semFonte = fontes.filter(f => f === "Não informado").length;
  const identificadas = total - semFonte;
  const porFonte = new Map<string, number>();
  for (const fonte of fontes) porFonte.set(fonte, (porFonte.get(fonte) ?? 0) + 1);
  const ranking = [...porFonte.entries()]
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"));
  const maior = Math.max(1, ...ranking.map(r => r.quantidade));
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho",
    "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const periodo = mes ? `${meses[Number(mes) - 1]} de ${ano}` : ano;

  return <div className="w-full min-w-0 space-y-5">
    <CabecalhoPagina titulo="Vendas por fonte" descricao="Veja quais canais trouxeram mais vendas assinadas para a Sacra." />
    <NavegacaoContexto nome="Vendas" links={[
      { href: "/vendas", label: "Processos de venda" },
      { href: "/vendas/fontes-leads", label: "Controle de vendas" },
      { href: "/vendas/fontes-leads/resultados", label: "Resultados por fonte" },
    ]} />

    <div className="flex flex-wrap items-end justify-between gap-3">
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium text-ink-muted">Ano
          <select name="ano" defaultValue={ano} className={`${INPUT_CLASS} mt-1 min-w-24`}>
            {[ano, "2026", "2027", "2025"].filter((v, i, a) => a.indexOf(v) === i)
              .map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-muted">Mês
          <select name="mes" defaultValue={mes} className={`${INPUT_CLASS} mt-1 min-w-40`}>
            <option value="">Ano inteiro</option>
            {meses.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
          </select>
        </label>
        <button type="submit" className={SECONDARY_BUTTON_CLASS}>Aplicar</button>
      </form>
      <Link href={`/vendas/fontes-leads?ano=${ano}`} className={SECONDARY_BUTTON_CLASS}>
        Voltar à planilha
      </Link>
    </div>

    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {[
        { titulo: "Vendas assinadas", valor: total, detalhe: periodo },
        { titulo: "Fonte identificada", valor: identificadas, detalhe: percentual(identificadas, total) + " do total" },
        { titulo: "Sem fonte", valor: semFonte, detalhe: "A classificar na planilha" },
      ].map(item => <section key={item.titulo} className={`${CARD_CLASS} min-w-0 p-3 sm:p-5`}>
        <p className="text-xs text-ink-muted sm:text-sm">{item.titulo}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-ink sm:text-3xl">{item.valor}</p>
        <p className="mt-1 text-xs text-ink-muted">{item.detalhe}</p>
      </section>)}
    </div>

    <section className={`${CARD_CLASS} p-4 sm:p-6`}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-ink">Vendas convertidas por fonte</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Quantidade de vendas assinadas e participação no total de {periodo.toLocaleLowerCase("pt-BR")}.
        </p>
      </div>
      {ranking.length === 0
        ? <p className="rounded-xl bg-background p-6 text-center text-sm text-ink-muted">Nenhuma venda assinada encontrada no período.</p>
        : <div className="space-y-5">
          {ranking.map((item, index) => <div key={item.nome} className="space-y-2">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <span className="min-w-0 font-medium text-ink">
                <span className="mr-2 text-xs tabular-nums text-ink-muted">{index + 1}º</span>
                {item.nome}
              </span>
              <span className="whitespace-nowrap font-semibold tabular-nums text-ink">
                {item.quantidade} {item.quantidade === 1 ? "venda" : "vendas"}
                <span className="ml-2 font-normal text-ink-muted">· {percentual(item.quantidade, total)}</span>
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-background" role="img"
              aria-label={`${item.nome}: ${item.quantidade} vendas, ${percentual(item.quantidade, total)} do total`}>
              <div className={`h-full rounded-full ${item.nome === "Não informado" ? "bg-slate-400" : "bg-brand"}`}
                style={{ width: `${(item.quantidade / maior) * 100}%` }} />
            </div>
          </div>)}
        </div>}
      <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-ink-muted">
        Este gráfico mostra a distribuição das vendas realizadas por origem, não a taxa de conversão de leads.
        Para calcular a taxa de conversão de cada canal, também seria necessário registrar todos os leads recebidos.
        Vendas sem fonte informada permanecem visíveis para evitar distorcer os resultados.
      </p>
    </section>
  </div>;
}
