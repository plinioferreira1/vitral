import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { INPUT_CLASS } from "@/components/ui/styles";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Wallet,
  AlertTriangle,
  RefreshCcw,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import { CartaoKpi } from "@/components/cartao-kpi";
import { apagarLancamentos, prepararBaixaEmLote } from "./lancamentos-actions";
import { hojeISO } from "@/lib/data-br";
import { somarDias } from "@/lib/recorrencia";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { BuscaOpcaoFinanceira } from "@/components/financeiro/busca-opcao";
import { TabelaLancamentos, type LancamentoLinha, type EstadoExibicao, type CampoOrdenacao } from "@/components/financeiro/tabela-lancamentos";
import { BotaoEnviar } from "@/components/botao-enviar";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";

const campoClasse =
  INPUT_CLASS;

function estadoExibicao(l: LancamentoLinha, hoje: string): EstadoExibicao {
  if (l.status === "cancelado") return "cancelado";
  if (l.status === "pago") return "pago";
  const aberto = l.status === "pendente" || l.status === "pago_parcial";
  if (aberto && l.vencimento < hoje) return "vencido";
  if (aberto && l.recorrencia_id) return "recorrente";
  if (l.status === "pago_parcial") return "pago_parcial";
  return "pendente";
}

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Filtros = {
  q?: string;
  status?: string;
  referencia?: string;
  categoria?: string;
  pessoa?: string;
  conta_bancaria?: string;
  unidade?: string;
  competencia?: string;
  ordenar?: string;
  direcao?: string;
  pagina?: string;
  por_pagina?: string;
};

type CampoOculto = [keyof Filtros, string | undefined];
type ReferenciaFiltro = "hoje" | "7dias" | "mes" | "todos";

const REFERENCIAS: { value: ReferenciaFiltro; label: string }[] = [
  { value: "hoje", label: "Vencem hoje" },
  { value: "7dias", label: "Próximos 7 dias" },
  { value: "mes", label: "Mês atual" },
  { value: "todos", label: "Todos os vencimentos" },
];

function normalizarReferencia(valor?: string): ReferenciaFiltro {
  return valor === "7dias" || valor === "mes" || valor === "todos" ? valor : "hoje";
}

function construirUrl(base: string, params: Filtros): string {
  const sp = new URLSearchParams();
  (Object.keys(params) as (keyof Filtros)[]).forEach((k) => {
    const v = params[k];
    if (v) sp.set(k, v);
  });
  const qs = sp.toString();
  return qs ? `${base}?${qs}#lista` : `${base}#lista`;
}

function linhaComparativo(percentual: number | null, aumentoBom: boolean) {
  if (percentual === null) return null;
  const subiu = percentual >= 0;
  const bom = subiu === aumentoBom;
  const Icone = subiu ? ArrowUp : ArrowDown;
  const cor = bom ? "text-emerald-600" : "text-rose-600";
  return (
    <p className={`mt-2 flex items-center gap-1 text-xs font-medium ${cor}`}>
      <Icone size={12} strokeWidth={2.5} />
      {Math.abs(percentual).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% em relação ao mês anterior
    </p>
  );
}

function variacao(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

function renderCamposOcultos(campos: CampoOculto[], omitir: (keyof Filtros)[] = []) {
  return campos
    .filter(([campo]) => !omitir.includes(campo))
    .map(([campo, valor]) => (valor ? <input key={campo} type="hidden" name={campo} value={valor} /> : null));
}

export async function PainelLancamentos({ tipo, searchParams }: { tipo: "receita" | "despesa"; searchParams?: Filtros }) {
  const supabase = await createClient();
  const hoje = hojeISO();
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7));
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  const fim = new Date(ano, mes, 0).toISOString().slice(0, 10);
  const anoAnterior = mes === 1 ? ano - 1 : ano;
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const inicioMesAnterior = `${anoAnterior}-${String(mesAnterior).padStart(2, "0")}-01`;
  const fimMesAnterior = new Date(anoAnterior, mesAnterior, 0).toISOString().slice(0, 10);
  const f = searchParams ?? {};
  const referencia = normalizarReferencia(f.referencia);
  const fim7Dias = somarDias(hoje, 6);

  // Consultas independentes em uma rodada, preservando a otimização da branch principal.
  const [
    { data: pessoas },
    { data: categorias },
    { data: centros },
    { data: unidades },
    { data: contas },
    { data: lancamentosTodos },
    { data: baixasRaw },
  ] = await Promise.all([
    supabase.from("financeiro_pessoas").select("id, nome").order("nome"),
    supabase.from("financeiro_categorias").select("id, nome").eq("tipo", tipo).order("nome"),
    supabase.from("financeiro_centros_custo").select("id, nome").order("nome"),
    supabase.from("financeiro_unidades").select("id, nome").order("nome"),
    supabase.from("financeiro_contas_bancarias").select("id, nome").eq("ativa", true).order("nome"),
    supabase
      .from("financeiro_lancamentos")
      .select(
        "id, descricao, valor, vencimento, competencia, status, recorrencia_id, pessoa_id, categoria_id, centro_custo_id, unidade_id, conta_bancaria_id, forma_pagamento, numero_documento, observacoes, financeiro_anexos ( nome ), financeiro_pessoas ( nome ), financeiro_categorias ( nome ), financeiro_unidades ( nome ), financeiro_contas_bancarias ( nome )"
      )
      .eq("tipo", tipo)
      .order("vencimento"),
    supabase.from("financeiro_baixas").select("lancamento_id, valor, data"),
  ]);

  const todos = (lancamentosTodos ?? []) as unknown as LancamentoLinha[];

  // KPIs do mês corrente, calculados sobre a lista completa (não filtrada).
  const noMes = todos.filter((l) => l.vencimento >= inicioMes && l.vencimento <= fim);
  const pendentesNoMes = noMes.filter((l) => l.status === "pendente" || l.status === "pago_parcial");
  const totalNoMes = pendentesNoMes.reduce((s, l) => s + Number(l.valor), 0);
  const vencidos = todos.filter((l) => (l.status === "pendente" || l.status === "pago_parcial") && l.vencimento < hoje);
  const totalVencidos = vencidos.reduce((s, l) => s + Number(l.valor), 0);
  const recorrentes = todos.filter((l) => l.recorrencia_id && (l.status === "pendente" || l.status === "pago_parcial"));
  const baixasNoMes = (baixasRaw ?? []).filter((b) => b.data >= inicioMes && b.data <= fim);
  const totalBaixadoNoMes = baixasNoMes
    .filter((b) => todos.some((l) => l.id === b.lancamento_id))
    .reduce((s, b) => s + Number(b.valor), 0);

  // Comparativos com o mês anterior (dados reais, não estimados).
  const comprometidoMes = todos
    .filter((l) => l.status !== "cancelado" && l.vencimento >= inicioMes && l.vencimento <= fim)
    .reduce((s, l) => s + Number(l.valor), 0);
  const comprometidoMesAnterior = todos
    .filter((l) => l.status !== "cancelado" && l.vencimento >= inicioMesAnterior && l.vencimento <= fimMesAnterior)
    .reduce((s, l) => s + Number(l.valor), 0);
  const vencidosMesAnterior = todos
    .filter((l) => (l.status === "pendente" || l.status === "pago_parcial") && l.vencimento < inicioMes)
    .reduce((s, l) => s + Number(l.valor), 0);
  const baixasMesAnterior = (baixasRaw ?? [])
    .filter((b) => b.data >= inicioMesAnterior && b.data <= fimMesAnterior && todos.some((l) => l.id === b.lancamento_id))
    .reduce((s, b) => s + Number(b.valor), 0);
  // Filtros (via querystring, navegação simples sem JS).
  const todosNaReferencia = todos.filter((l) => {
    if (referencia === "todos") return true;
    if (referencia === "hoje") return l.vencimento === hoje;
    if (referencia === "7dias") return l.vencimento >= hoje && l.vencimento <= fim7Dias;
    return l.vencimento >= inicioMes && l.vencimento <= fim;
  });

  let lancamentos = todosNaReferencia.filter((l) => {
    if (f.status === "sem_categoria") {
      if (l.categoria_id !== null || (l.status !== "pago" && l.status !== "pago_parcial")) return false;
    } else if (f.status === "em_aberto") {
      if (l.status !== "pendente" && l.status !== "pago_parcial") return false;
    } else if (f.status && estadoExibicao(l, hoje) !== f.status) {
      return false;
    } else if (!f.status && l.status === "cancelado") {
      return false;
    }
    if (f.categoria && l.categoria_id !== f.categoria) return false;
    if (f.pessoa && l.pessoa_id !== f.pessoa) return false;
    if (f.conta_bancaria && l.conta_bancaria_id !== f.conta_bancaria) return false;
    if (f.unidade && l.unidade_id !== f.unidade) return false;
    if (f.competencia && (l.competencia ?? l.vencimento).slice(0, 7) !== f.competencia) return false;
    if (f.q) {
      const termo = f.q.toLowerCase();
      const combinado = `${l.descricao} ${l.financeiro_pessoas?.nome ?? ""} ${l.financeiro_categorias?.nome ?? ""}`.toLowerCase();
      if (!combinado.includes(termo)) return false;
    }
    return true;
  });

  // Ordenação.
  const ordenar = ((["descricao", "pessoa", "categoria", "vencimento", "valor", "status"] as string[]).includes(
    f.ordenar ?? ""
  )
    ? f.ordenar
    : "vencimento") as CampoOrdenacao;
  const direcao = f.direcao === "desc" ? "desc" : "asc";
  const sinal = direcao === "asc" ? 1 : -1;
  lancamentos = [...lancamentos].sort((a, b) => {
    let va: string | number;
    let vb: string | number;
    switch (ordenar) {
      case "descricao":
        va = a.descricao.toLowerCase();
        vb = b.descricao.toLowerCase();
        break;
      case "pessoa":
        va = (a.financeiro_pessoas?.nome ?? "").toLowerCase();
        vb = (b.financeiro_pessoas?.nome ?? "").toLowerCase();
        break;
      case "categoria":
        va = (a.financeiro_categorias?.nome ?? "").toLowerCase();
        vb = (b.financeiro_categorias?.nome ?? "").toLowerCase();
        break;
      case "valor":
        va = Number(a.valor);
        vb = Number(b.valor);
        break;
      case "status":
        va = estadoExibicao(a, hoje);
        vb = estadoExibicao(b, hoje);
        break;
      default:
        va = a.vencimento;
        vb = b.vencimento;
    }
    if (va < vb) return -1 * sinal;
    if (va > vb) return 1 * sinal;
    return 0;
  });

  // Paginação.
  const porPagina = Math.max(1, Number(f.por_pagina) || 10);
  const totalItens = lancamentos.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / porPagina));
  const paginaAtual = Math.min(Math.max(1, Number(f.pagina) || 1), totalPaginas);
  const inicioPagina = (paginaAtual - 1) * porPagina;
  const lancamentosPagina = lancamentos.slice(inicioPagina, inicioPagina + porPagina);

  const titulo = tipo === "receita" ? "Contas a Receber" : "Contas a Pagar";
  const rotuloPessoa = tipo === "receita" ? "Cliente" : "Fornecedor";
  const rota = tipo === "receita" ? "/financeiro/contas-a-receber" : "/financeiro/contas-a-pagar";
  const temFiltro = !!(
    f.status ||
    f.categoria ||
    f.pessoa ||
    f.conta_bancaria ||
    f.unidade ||
    f.competencia ||
    f.q ||
    referencia !== "hoje"
  );
  const abasSituacao: [string, string, number][] = [
    ["", "Todos", todosNaReferencia.filter((l) => l.status !== "cancelado").length],
    ["em_aberto", "Em aberto", todosNaReferencia.filter((l) => l.status === "pendente" || l.status === "pago_parcial").length],
    ["vencido", "Vencidos", todosNaReferencia.filter((l) => estadoExibicao(l, hoje) === "vencido").length],
    ["recorrente", "Recorrentes", todosNaReferencia.filter((l) => estadoExibicao(l, hoje) === "recorrente").length],
    ["pago", tipo === "receita" ? "Recebidos" : "Pagos", todosNaReferencia.filter((l) => l.status === "pago").length],
    ["cancelado", "Cancelados", todosNaReferencia.filter((l) => l.status === "cancelado").length],
  ];
  if (tipo === "receita") {
    abasSituacao.splice(5, 0, [
      "sem_categoria",
      "Sem categoria",
      todosNaReferencia.filter((l) => l.categoria_id === null && (l.status === "pago" || l.status === "pago_parcial")).length,
    ]);
  }

  function linkOrdenar(campo: CampoOrdenacao): string {
    const novaDirecao = ordenar === campo && direcao === "asc" ? "desc" : "asc";
    return construirUrl(rota, { ...f, ordenar: campo, direcao: novaDirecao, pagina: undefined });
  }
  function iconeOrdenacao(campo: CampoOrdenacao) {
    if (campo !== ordenar) return <ChevronsUpDown size={12} className="text-ink-muted/50" />;
    return direcao === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  const camposOcultos: CampoOculto[] = [
    ["q", f.q],
    ["status", f.status],
    ["referencia", referencia],
    ["categoria", f.categoria],
    ["pessoa", f.pessoa],
    ["conta_bancaria", f.conta_bancaria],
    ["unidade", f.unidade],
    ["competencia", f.competencia],
    ["ordenar", f.ordenar],
    ["direcao", f.direcao],
    ["por_pagina", f.por_pagina],
  ];
  return (
    <div className="financeiro-ui mx-auto w-full min-w-0 space-y-5">
      <CabecalhoPagina titulo={titulo}
        descricao={tipo === "receita" ? "Acompanhe os valores a receber e registre recebimentos completos ou parciais." : "Acompanhe vencimentos, consulte os boletos e registre pagamentos completos ou parciais."}
        acao={<Link href={`/financeiro/lancamentos/novo?tipo=${tipo}`} className={PRIMARY_BUTTON_CLASS}><Plus size={16} /> {tipo === "receita" ? "Nova receita" : "Nova despesa"}</Link>}
      />

      <div className="flex gap-2 overflow-x-auto overscroll-x-contain border-b border-border sm:flex-wrap">
          {abasSituacao.map(([valor, label, contagem]) => (
            <Link
              key={valor || "todos"}
              href={construirUrl(rota, { ...f, status: valor || undefined, pagina: undefined })}
              className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                (f.status ?? "") === valor
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {label} {contagem > 0 && <span className="text-xs">({contagem})</span>}
            </Link>
          ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoKpi
          icon={Wallet}
          tom="marca"
          label={`${tipo === "receita" ? "A receber" : "A pagar"} no mês`}
          valor={brl(totalNoMes)}
          href={`${rota}?referencia=mes&status=em_aberto#lista`}
          rodape={linhaComparativo(variacao(comprometidoMes, comprometidoMesAnterior), false)}
        />
        <CartaoKpi
          icon={AlertTriangle}
          tom="perigo"
          label={`Vencidos (${vencidos.length})`}
          valor={brl(totalVencidos)}
          href={`${rota}?referencia=todos&status=vencido#lista`}
          rodape={linhaComparativo(variacao(totalVencidos, vencidosMesAnterior), false)}
        />
        <CartaoKpi
          icon={RefreshCcw}
          tom="info"
          label="Recorrentes em aberto"
          valor={recorrentes.length}
          href={`${rota}?referencia=todos&status=recorrente#lista`}
        />
        <CartaoKpi
          icon={CheckCircle2}
          tom="sucesso"
          label={`${tipo === "receita" ? "Recebidos" : "Pagos"} no mês`}
          valor={brl(totalBaixadoNoMes)}
          href={`${rota}?referencia=mes&status=pago#lista`}
          rodape={linhaComparativo(variacao(totalBaixadoNoMes, baixasMesAnterior), true)}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:flex-row sm:items-center">
        <form method="get" action={`${rota}#lista`} className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            name="q"
            defaultValue={f.q ?? ""}
            placeholder={`Buscar por descrição, ${rotuloPessoa.toLowerCase()}, categoria...`}
            className={`${campoClasse} pl-9`}
          />
          <BotaoEnviar className="sr-only">
            Buscar
          </BotaoEnviar>
          {renderCamposOcultos(camposOcultos, ["q"])}
        </form>
        <form
          method="get"
          action={`${rota}#lista`}
          className="flex w-full shrink-0 items-end gap-2 rounded-lg border border-brand/20 bg-brand/5 p-2 sm:w-auto"
        >
          {renderCamposOcultos(camposOcultos, ["referencia"])}
          <div className="w-full sm:w-auto">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand">Ver vencimentos</label>
            <SelectAutoSubmit
              name="referencia"
              defaultValue={referencia}
              options={REFERENCIAS}
              className="w-full min-w-[220px] rounded-md border border-brand/30 bg-surface px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            />
          </div>
        </form>

      </div>

      <details open={temFiltro} className="group rounded-2xl border border-border/70 bg-surface shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-ink-muted">
              <SlidersHorizontal size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Filtros</p>
              <p className="truncate text-xs text-ink-muted">
                {temFiltro ? "Há filtros aplicados à lista." : "Refine por referência, status, categoria, pessoa, conta, competência ou unidade."}
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-brand group-open:hidden">Abrir</span>
          <span className="hidden text-xs font-medium text-brand group-open:inline">Fechar</span>
        </summary>
        <form
          method="get"
          action={`${rota}#lista`}
          className="grid grid-cols-1 gap-3 border-t border-border/70 px-4 py-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
        >
        <input type="hidden" name="q" value={f.q ?? ""} />
        <input type="hidden" name="referencia" value={referencia} />
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Status</label>
          <select name="status" defaultValue={f.status ?? ""} className={campoClasse}>
            <option value="">Todos</option>
            <option value="em_aberto">Em aberto</option>
            <option value="pendente">Pendente</option>
            <option value="vencido">Vencido</option>
            <option value="recorrente">Recorrente</option>
            <option value="pago_parcial">Pago parcial</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
            {tipo === "receita" && <option value="sem_categoria">Sem categoria</option>}
          </select>
        </div>
        <BuscaOpcaoFinanceira name="categoria" label="Categoria" options={categorias ?? []} initialId={f.categoria ?? ""} placeholder="Todas" emptyLabel="Todas" />
        <BuscaOpcaoFinanceira name="pessoa" label={rotuloPessoa} options={pessoas ?? []} initialId={f.pessoa ?? ""} placeholder="Todos" emptyLabel="Todos" />
        <BuscaOpcaoFinanceira name="conta_bancaria" label="Conta bancária" options={contas ?? []} initialId={f.conta_bancaria ?? ""} placeholder="Todas" emptyLabel="Todas" />
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Competência</label>
          <input name="competencia" type="month" defaultValue={f.competencia ?? ""} className={campoClasse} />
        </div>
        <BuscaOpcaoFinanceira name="unidade" label="Unidade" options={unidades ?? []} initialId={f.unidade ?? ""} placeholder="Todas" emptyLabel="Todas" />
        <input type="hidden" name="ordenar" value={f.ordenar ?? ""} />
        <input type="hidden" name="direcao" value={f.direcao ?? ""} />
        <input type="hidden" name="por_pagina" value={f.por_pagina ?? ""} />
        <BotaoEnviar className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Filtrar
        </BotaoEnviar>
        {temFiltro && (
          <a href={`${rota}#lista`} className="text-xs text-ink-muted hover:text-brand hover:underline">
            Limpar filtros
          </a>
        )}
        </form>
      </details>

      <form method="get" action={`${rota}#lista`} className="grid grid-cols-2 gap-3 md:hidden">
        {renderCamposOcultos(camposOcultos, ["ordenar", "direcao"])}
        <label className="text-xs font-medium text-ink-muted">Ordenar por
          <select name="ordenar" defaultValue={ordenar} className={`${campoClasse} mt-1`}>
            <option value="vencimento">Vencimento</option><option value="descricao">Descrição</option>
            <option value="valor">Valor</option><option value="status">Status</option>
            <option value="pessoa">{rotuloPessoa}</option><option value="categoria">Categoria</option>
          </select>
        </label>
        <label className="text-xs font-medium text-ink-muted">Ordem
          <select name="direcao" defaultValue={direcao} className={`${campoClasse} mt-1`}>
            <option value="asc">Crescente</option><option value="desc">Decrescente</option>
          </select>
        </label>
        <BotaoEnviar className="col-span-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink">Aplicar ordenação</BotaoEnviar>
      </form>

      {lancamentos.length > 0 && (
        <form
          id="form-acoes-lote"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface px-4 py-3 text-xs text-ink-muted shadow-sm"
        >
          <input type="hidden" name="return_to" value={construirUrl(rota, f)} />
          <div>
            <p className="font-semibold text-ink">Ações em lote</p>
            <p className="mt-0.5">Marque lançamentos em aberto para baixar ou apagar vários de uma vez.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BotaoEnviar
              formAction={prepararBaixaEmLote}
              name="acao_lote"
              value="baixar"
              textoEnviando="Abrindo conferência..."
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Dar baixa nos selecionados
            </BotaoEnviar>
            <BotaoComConfirmacao
              formAction={apagarLancamentos}
              name="acao_lote"
              value="apagar"
              textoEnviando="Apagando..."
              mensagem="Apagar definitivamente os lançamentos pendentes selecionados? Esta ação não pode ser desfeita."
              className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
            >
              Apagar selecionados
            </BotaoComConfirmacao>
          </div>
        </form>
      )}

      <div id="lista" className="financeiro-lista scroll-mt-4 rounded-2xl border border-border/70 bg-surface shadow-sm">
        {lancamentos.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            {temFiltro ? "Nenhum lançamento encontrado com esses filtros." : "Nenhum lançamento ainda."}
          </p>
        ) : (
          <>
            <TabelaLancamentos linhas={lancamentosPagina.map((l) => ({ ...l, estado: estadoExibicao(l, hoje) }))}
              tipo={tipo} rotuloPessoa={rotuloPessoa} categorias={categorias ?? []} centros={centros ?? []}
              linkOrdenar={linkOrdenar} iconeOrdenacao={iconeOrdenacao} />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-ink-muted">
              <span>
                Mostrando {totalItens === 0 ? 0 : inicioPagina + 1} a {Math.min(inicioPagina + porPagina, totalItens)} de{" "}
                {totalItens} lançamentos
              </span>
              <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto">
                <div className="flex flex-wrap items-center gap-1">
                  <Link
                    href={construirUrl(rota, { ...f, pagina: String(Math.max(1, paginaAtual - 1)) })}
                    aria-label="Página anterior"
                    aria-disabled={paginaAtual === 1}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border p-1.5 ${
                      paginaAtual === 1 ? "pointer-events-none opacity-40" : "hover:bg-background"
                    }`}
                  >
                    <ChevronLeft size={14} />
                  </Link>
                  {Array.from({ length: totalPaginas })
                    .map((_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPaginas || Math.abs(n - paginaAtual) <= 1)
                    .reduce<number[]>((acc, n) => {
                      if (acc.length > 0 && n - acc[acc.length - 1] > 1) acc.push(-1);
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, i) =>
                      n === -1 ? (
                        <span key={`gap-${i}`} className="px-1">
                          …
                        </span>
                      ) : (
                        <Link
                          key={n}
                          href={construirUrl(rota, { ...f, pagina: String(n) })}
                          aria-label={`Página ${n}`}
                          aria-current={n === paginaAtual ? "page" : undefined}
                          className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-2.5 py-1 ${
                            n === paginaAtual
                              ? "border-brand bg-brand text-white"
                              : "border-border text-ink-muted hover:bg-background"
                          }`}
                        >
                          {n}
                        </Link>
                      )
                    )}
                  <Link
                    href={construirUrl(rota, { ...f, pagina: String(Math.min(totalPaginas, paginaAtual + 1)) })}
                    aria-label="Próxima página"
                    aria-disabled={paginaAtual === totalPaginas}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border p-1.5 ${
                      paginaAtual === totalPaginas ? "pointer-events-none opacity-40" : "hover:bg-background"
                    }`}
                  >
                    <ChevronRight size={14} />
                  </Link>
                </div>
                <form method="get" action={`${rota}#lista`} className="flex items-center gap-1.5">
                  {renderCamposOcultos(camposOcultos, ["por_pagina"])}
                  <SelectAutoSubmit
                    name="por_pagina"
                    defaultValue={String(porPagina)}
                    options={[
                      { value: "10", label: "10 por página" },
                      { value: "25", label: "25 por página" },
                      { value: "50", label: "50 por página" },
                    ]}
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-brand"
                  />
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
