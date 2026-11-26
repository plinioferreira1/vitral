import Link from "next/link";
import { randomUUID } from "node:crypto";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { NavegacaoContexto } from "@/components/navegacao-contexto";
import {
  CARD_CLASS,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/components/ui/styles";
import { hojeISO } from "@/lib/data-br";
import { formatarMoedaBR } from "@/lib/moeda";
import {
  filtroNegociacoes,
  filtrarNegociacoes,
  filtroAcompanhamento,
  filtrarAcompanhamento,
  classificarAcompanhamento,
  mesValido,
  metricasNegociacoes,
  SITUACAO_LABEL,
} from "@/lib/negociacoes/regras";
import {
  acessoNegociacoes,
  carregarNegociacoes,
  opcoesNegociacoes,
} from "./dados";
import { FormularioNegociacao } from "./formulario";

export default async function NegociacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    mes?: string;
    responsavel?: string;
    situacao?: string;
    acompanhamento?: string;
    nova?: string;
  }>;
}) {
  const s = await acessoNegociacoes();
  const params = await searchParams;
  const mes = mesValido(params.mes, hojeISO().slice(0, 7));
  const filtro = filtroNegociacoes(params.situacao);
  const atencao = filtroAcompanhamento(params.acompanhamento);
  const hoje = hojeISO();
  const [todas, opcoes] = await Promise.all([
    carregarNegociacoes(s.supabase, s.tenantId),
    opcoesNegociacoes(s.supabase, s.tenantId),
  ]);
  // Responsáveis desativados continuam disponíveis no histórico e nos filtros.
  const idsAusentes = [...new Set(todas.map((n) => n.responsavel_id))].filter(
    (id) => !opcoes.responsaveis.some((r) => r.id === id),
  );
  const antigos = idsAusentes.length
    ? await s.supabase
        .from("usuarios")
        .select("id,nome")
        .eq("tenant_id", s.tenantId)
        .in("id", idsAusentes)
    : { data: [], error: null };
  if (antigos.error)
    throw new Error("Não foi possível carregar os responsáveis.");
  const responsaveis = [...opcoes.responsaveis, ...(antigos.data ?? [])];
  const nomes = new Map(responsaveis.map((r) => [r.id, r.nome]));
  const responsavel = params.responsavel ?? "";
  const base = responsavel
    ? todas.filter((n) => n.responsavel_id === responsavel)
    : todas;
  const m = metricasNegociacoes(base, mes);
  const abertos = base.filter(n => n.situacao === "em_andamento");
  const pendencias = {
    vencidas: abertos.filter(n => classificarAcompanhamento(n, hoje) === "vencidas").length,
    hoje: abertos.filter(n => classificarAcompanhamento(n, hoje) === "hoje").length,
    sem_data: abertos.filter(n => classificarAcompanhamento(n, hoje) === "sem_data").length,
  };
  const lista = filtrarAcompanhamento(filtrarNegociacoes(base, atencao === "todos" ? filtro : "em_andamento", mes), atencao, hoje)
    .sort((a,b) => (a.data_acompanhamento ?? "9999-12-31").localeCompare(b.data_acompanhamento ?? "9999-12-31"));
  const href = (situacao: string, acompanhamento = "todos") =>
    `/vendas/negociacoes?${new URLSearchParams({ mes, responsavel, situacao, acompanhamento })}`;
  const motivos = new Map<string, number>();
  for (const n of filtrarNegociacoes(base, "perdida", mes))
    motivos.set(
      n.motivo_perda ?? "Não informado",
      (motivos.get(n.motivo_perda ?? "Não informado") ?? 0) + 1,
    );
  return (
    <div className="w-full min-w-0 space-y-6">
      <CabecalhoPagina
        titulo="Negociações de venda"
        descricao="Acompanhe as oportunidades até o fechamento e veja os resultados de cada mês."
        acao={
          s.podeEditar ? (
            <Link
              href="/vendas/negociacoes?nova=1#cadastro"
              className={PRIMARY_BUTTON_CLASS}
            >
              Nova negociação
            </Link>
          ) : undefined
        }
      />
      <NavegacaoContexto
        nome="Vendas"
        links={[
          { href: "/vendas", label: "Processos de venda" },
          { href: "/vendas/negociacoes", label: "Negociações" },
        ]}
      />
      <form className={`${CARD_CLASS} flex flex-wrap items-end gap-4 p-4`}>
        <div>
          <label htmlFor="mes" className="mb-1.5 block text-sm font-medium">
            Mês dos indicadores
          </label>
          <input
            id="mes"
            name="mes"
            type="month"
            min="2000-01"
            max="2100-12"
            defaultValue={mes}
            className={INPUT_CLASS}
          />
        </div>
        <div className="min-w-0 flex-1 sm:min-w-56">
          <label
            htmlFor="responsavel"
            className="mb-1.5 block text-sm font-medium"
          >
            Responsável
          </label>
          <select
            id="responsavel"
            name="responsavel"
            defaultValue={responsavel}
            className={INPUT_CLASS}
          >
            <option value="">Todos</option>
            {responsaveis.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
        </div>
        <input type="hidden" name="situacao" value={filtro} />
        <input type="hidden" name="acompanhamento" value={atencao} />
        <button className={SECONDARY_BUTTON_CLASS}>Aplicar filtros</button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            titulo: "Em andamento agora",
            valor: m.abertas,
            detalhe: formatarMoedaBR(m.valorAberto),
            filtro: "em_andamento",
          },
          {
            titulo: "Novas no mês",
            valor: m.novas,
            detalhe: "Pela data de abertura",
            filtro: "novas",
          },
          {
            titulo: "Convertidas no mês",
            valor: m.convertidas,
            detalhe: formatarMoedaBR(m.valorConvertido),
            filtro: "convertida",
          },
          {
            titulo: "Perdidas no mês",
            valor: m.perdidas,
            detalhe: formatarMoedaBR(m.valorPerdido),
            filtro: "perdida",
          },
        ].map((c) => (
          <Link
            key={c.filtro}
            href={href(c.filtro)}
            className={`${CARD_CLASS} p-4 hover:border-brand/40 ${filtro === c.filtro ? "ring-1 ring-brand/30" : ""}`}
          >
            <p className="text-sm text-ink-muted">{c.titulo}</p>
            <p className="my-2 text-3xl font-bold text-ink">{c.valor}</p>
            <p className="text-sm text-ink-muted">{c.detalhe}</p>
          </Link>
        ))}
        <div className={`${CARD_CLASS} p-4`}>
          <p className="text-sm text-ink-muted">Taxa de conversão</p>
          <p className="my-2 text-2xl font-bold text-brand">
            {m.taxa === null
              ? "—"
              : `${m.taxa.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          </p>
          <p className="text-xs leading-5 text-ink-muted">
            {m.taxa === null
              ? "Sem encerramentos no mês."
              : "Convertidas ÷ (convertidas + perdidas) no mês."}
          </p>
        </div>
      </div>
      <section className="space-y-3" aria-label="Acompanhamentos prioritários">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">Acompanhamentos que precisam de atenção</h2>
          {atencao !== "todos" && <Link className="text-sm font-medium text-brand hover:underline" href={href("em_andamento")}>Limpar filtro</Link>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            { chave: "vencidas", titulo: "Atrasadas", numero: pendencias.vencidas, cor: "border-rose-300 bg-rose-50/70 text-rose-900" },
            { chave: "hoje", titulo: "Para acompanhar hoje", numero: pendencias.hoje, cor: "border-amber-300 bg-amber-50/70 text-amber-900" },
            { chave: "sem_data", titulo: "Sem próximo contato", numero: pendencias.sem_data, cor: "border-border bg-surface text-ink" },
          ] as const).map(item => (
            <Link key={item.chave} href={href("em_andamento",item.chave)} className={`rounded-xl border p-4 transition hover:shadow-sm ${item.cor} ${atencao === item.chave ? "ring-2 ring-current/20" : ""}`}>
              <p className="text-sm font-medium">{item.titulo}</p>
              <p className="mt-1 text-3xl font-bold">{item.numero}</p>
              <p className="mt-1 text-xs opacity-80">Abrir negociações</p>
            </Link>
          ))}
        </div>
      </section>
      <p className="text-sm text-ink-muted">
        Convertidas e perdidas usam a data do encerramento, mesmo quando abertas
        em outro mês. O saldo em andamento é atual. Os valores representam
        vendas, sem somar comissões.
      </p>
      {params.nova === "1" && s.podeEditar && (
        <section id="cadastro" className="scroll-mt-6 space-y-3">
          <h2 className="text-lg font-semibold">Nova negociação</h2>
          <FormularioNegociacao
            id={randomUUID()}
            responsaveis={opcoes.responsaveis}
            corretores={opcoes.corretores}
            usuarioId={s.user.id}
          />
        </section>
      )}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {atencao === "vencidas" ? "Acompanhamentos atrasados"
              : atencao === "hoje" ? "Acompanhamentos de hoje"
              : atencao === "sem_data" ? "Negociações sem próximo contato"
              : filtro === "em_andamento"
              ? "Negociações em andamento"
              : filtro === "todas"
                ? "Todas as negociações"
                : filtro === "novas"
                  ? "Novas negociações no mês"
                  : `${SITUACAO_LABEL[filtro]}s no mês`}{" "}
            ({lista.length})
          </h2>
          <Link href={href("todas")} className={SECONDARY_BUTTON_CLASS}>
            Ver todo o histórico
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {lista.map((n) => (
            <article key={n.id} className={`${CARD_CLASS} space-y-3 p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link
                  href={`/vendas/negociacoes/${n.id}`}
                  className="font-semibold text-brand hover:underline"
                >
                  {n.cliente_nome}
                </Link>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${n.situacao === "convertida" ? "bg-emerald-50 text-emerald-800" : n.situacao === "perdida" ? "bg-rose-50 text-rose-800" : "bg-brand-soft text-brand"}`}
                >
                  {SITUACAO_LABEL[n.situacao]}
                </span>
              </div>
              <p className="break-words text-sm text-ink">
                {n.imovel_endereco}
              </p>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span>{formatarMoedaBR(n.valor)}</span>
                <span className="text-ink-muted">
                  {nomes.get(n.responsavel_id) ?? "Responsável indisponível"}
                </span>
              </div>
              {n.situacao === "em_andamento" && (
                <p className={`text-sm ${classificarAcompanhamento(n, hoje) === "vencidas" ? "font-semibold text-rose-800" : classificarAcompanhamento(n, hoje) === "hoje" ? "font-semibold text-amber-800" : "text-ink-muted"}`}>
                  {n.proxima_acao || "Próxima ação a definir"}
                  {n.data_acompanhamento
                    ? ` · ${n.data_acompanhamento.split("-").reverse().join("/")}`
                    : ""}
                </p>
              )}
              {n.motivo_perda && (
                <p className="break-words text-sm text-rose-800">
                  Motivo: {n.motivo_perda}
                </p>
              )}
              <Link
                href={`/vendas/negociacoes/${n.id}`}
                className={SECONDARY_BUTTON_CLASS}
              >
                Abrir negociação →
              </Link>
            </article>
          ))}
        </div>
        {!lista.length && (
          <p className={`${CARD_CLASS} p-6 text-sm text-ink-muted`}>
            Nenhuma negociação para este filtro.
          </p>
        )}
      </section>
      {motivos.size > 0 && (
        <section className={`${CARD_CLASS} p-5`}>
          <h2 className="font-semibold">Motivos de perda no mês</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[...motivos]
              .sort((a, b) => b[1] - a[1])
              .map(([motivo, qtd]) => (
                <li key={motivo} className="flex justify-between gap-4">
                  <span className="break-words">{motivo}</span>
                  <strong>{qtd}</strong>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
