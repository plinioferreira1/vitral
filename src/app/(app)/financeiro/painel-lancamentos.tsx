import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Repeat,
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
  Pencil,
  Ban,
  Tag,
  MoreHorizontal,
} from "lucide-react";
import { CartaoKpi } from "@/components/cartao-kpi";
import {
  criarLancamento,
  registrarBaixa,
  cancelarLancamento,
  editarLancamento,
  apagarLancamentos,
  categorizarLancamento,
} from "./lancamentos-actions";
import { hojeISO } from "@/lib/data-br";
import { SelecionarTodos } from "@/components/selecionar-todos";
import { SelectAutoSubmit } from "@/components/select-auto-submit";

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

type EstadoExibicao = "vencido" | "pago" | "cancelado" | "recorrente" | "pago_parcial" | "pendente";

const ESTADO_ROTULO: Record<EstadoExibicao, string> = {
  vencido: "Vencido",
  pago: "Pago",
  cancelado: "Cancelado",
  recorrente: "Recorrente",
  pago_parcial: "Pago parcial",
  pendente: "Pendente",
};
const ESTADO_COR: Record<EstadoExibicao, string> = {
  vencido: "bg-rose-500",
  pago: "bg-emerald-500",
  cancelado: "bg-stone-400",
  recorrente: "bg-blue-500",
  pago_parcial: "bg-indigo-500",
  pendente: "bg-amber-500",
};
const ESTADO_TEXTO: Record<EstadoExibicao, string> = {
  vencido: "text-rose-700",
  pago: "text-emerald-700",
  cancelado: "text-stone-500",
  recorrente: "text-blue-700",
  pago_parcial: "text-indigo-700",
  pendente: "text-amber-700",
};

type LancamentoLinha = {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  competencia: string | null;
  status: string;
  recorrencia_id: string | null;
  pessoa_id: string | null;
  categoria_id: string | null;
  centro_custo_id: string | null;
  unidade_id: string | null;
  conta_bancaria_id: string | null;
  forma_pagamento: string | null;
  numero_documento: string | null;
  observacoes: string | null;
  financeiro_pessoas: { nome: string } | null;
  financeiro_categorias: { nome: string } | null;
  financeiro_unidades: { nome: string } | null;
  financeiro_contas_bancarias: { nome: string } | null;
};

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
function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

type Filtros = {
  q?: string;
  status?: string;
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

type CampoOrdenacao = "descricao" | "pessoa" | "categoria" | "vencimento" | "valor" | "status";

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

  const [{ data: pessoas }, { data: categorias }, { data: centros }, { data: unidades }, { data: contas }] =
    await Promise.all([
      supabase.from("financeiro_pessoas").select("id, nome").order("nome"),
      supabase.from("financeiro_categorias").select("id, nome").eq("tipo", tipo).order("nome"),
      supabase.from("financeiro_centros_custo").select("id, nome").order("nome"),
      supabase.from("financeiro_unidades").select("id, nome").order("nome"),
      supabase.from("financeiro_contas_bancarias").select("id, nome").eq("ativa", true).order("nome"),
    ]);

  const { data: lancamentosTodos } = await supabase
    .from("financeiro_lancamentos")
    .select(
      "id, descricao, valor, vencimento, competencia, status, recorrencia_id, pessoa_id, categoria_id, centro_custo_id, unidade_id, conta_bancaria_id, forma_pagamento, numero_documento, observacoes, financeiro_pessoas ( nome ), financeiro_categorias ( nome ), financeiro_unidades ( nome ), financeiro_contas_bancarias ( nome )"
    )
    .eq("tipo", tipo)
    .order("vencimento");

  const { data: baixasRaw } = await supabase
    .from("financeiro_baixas")
    .select("lancamento_id, valor, data");
  const baixadoPorLancamento = new Map<string, number>();
  (baixasRaw ?? []).forEach((b) => {
    baixadoPorLancamento.set(b.lancamento_id, (baixadoPorLancamento.get(b.lancamento_id) ?? 0) + Number(b.valor));
  });

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
  const percentualRecorrentes = todos.length > 0 ? (recorrentes.length / todos.length) * 100 : 0;

  // Filtros (via querystring, navegação simples sem JS).
  const f = searchParams ?? {};
  let lancamentos = todos.filter((l) => {
    if (f.status === "sem_categoria") {
      if (l.categoria_id !== null || (l.status !== "pago" && l.status !== "pago_parcial")) return false;
    } else if (f.status && estadoExibicao(l, hoje) !== f.status) {
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
  const temFiltro = !!(f.status || f.categoria || f.pessoa || f.conta_bancaria || f.unidade || f.competencia || f.q);

  function linkOrdenar(campo: CampoOrdenacao): string {
    const novaDirecao = ordenar === campo && direcao === "asc" ? "desc" : "asc";
    return construirUrl(rota, { ...f, ordenar: campo, direcao: novaDirecao, pagina: undefined });
  }
  function iconeOrdenacao(campo: CampoOrdenacao) {
    if (campo !== ordenar) return <ChevronsUpDown size={12} className="text-ink-muted/50" />;
    return direcao === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  const camposOcultos: [keyof Filtros, string | undefined][] = [
    ["q", f.q],
    ["status", f.status],
    ["categoria", f.categoria],
    ["pessoa", f.pessoa],
    ["conta_bancaria", f.conta_bancaria],
    ["unidade", f.unidade],
    ["competencia", f.competencia],
    ["ordenar", f.ordenar],
    ["direcao", f.direcao],
    ["por_pagina", f.por_pagina],
  ];
  function CamposOcultos({ omitir = [] }: { omitir?: (keyof Filtros)[] }) {
    return (
      <>
        {camposOcultos
          .filter(([campo]) => !omitir.includes(campo))
          .map(([campo, valor]) => (valor ? <input key={campo} type="hidden" name={campo} value={valor} /> : null))}
      </>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">{titulo}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Lançamentos manuais e recorrentes para gerenciar os seus{" "}
          {tipo === "receita" ? "recebimentos" : "compromissos financeiros"}, com controle de vencimentos e{" "}
          {tipo === "receita" ? "recebimentos" : "pagamentos"}.
        </p>
      </div>

      {tipo === "receita" && (
        <div className="flex flex-wrap gap-2 border-b border-border">
          {(
            [
              ["", "Todos", todos.length],
              ["pendente", "Pendentes", todos.filter((l) => l.status === "pendente" || l.status === "pago_parcial").length],
              ["pago", "Recebidos", todos.filter((l) => l.status === "pago").length],
              [
                "sem_categoria",
                "Sem categoria",
                todos.filter((l) => l.categoria_id === null && (l.status === "pago" || l.status === "pago_parcial")).length,
              ],
            ] as [string, string, number][]
          ).map(([valor, label, contagem]) => (
            <Link
              key={valor || "todos"}
              href={valor ? `${rota}?status=${valor}` : rota}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                (f.status ?? "") === valor
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {label} {contagem > 0 && <span className="text-xs">({contagem})</span>}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoKpi
          icon={Wallet}
          tom="marca"
          label={`${tipo === "receita" ? "A receber" : "A pagar"} no mês`}
          valor={brl(totalNoMes)}
          href={`${rota}?status=pendente#lista`}
          rodape={linhaComparativo(variacao(comprometidoMes, comprometidoMesAnterior), false)}
        />
        <CartaoKpi
          icon={AlertTriangle}
          tom="perigo"
          label={`Vencidos (${vencidos.length})`}
          valor={brl(totalVencidos)}
          href={`${rota}?status=vencido#lista`}
          rodape={linhaComparativo(variacao(totalVencidos, vencidosMesAnterior), false)}
        />
        <CartaoKpi
          icon={RefreshCcw}
          tom="info"
          label="Recorrentes em aberto"
          valor={recorrentes.length}
          href={`${rota}?status=recorrente#lista`}
          rodape={
            <p className="mt-2 text-xs text-ink-muted">
              {percentualRecorrentes.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% do total de lançamentos
            </p>
          }
        />
        <CartaoKpi
          icon={CheckCircle2}
          tom="sucesso"
          label={`${tipo === "receita" ? "Recebidos" : "Pagos"} no mês`}
          valor={brl(totalBaixadoNoMes)}
          href={`${rota}?status=pago#lista`}
          rodape={linhaComparativo(variacao(totalBaixadoNoMes, baixasMesAnterior), true)}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-surface p-4 shadow-sm sm:flex-row sm:items-center">
        <form method="get" action={`${rota}#lista`} className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            name="q"
            defaultValue={f.q ?? ""}
            placeholder={`Buscar por descrição, ${rotuloPessoa.toLowerCase()}, categoria...`}
            className={`${campoClasse} pl-9`}
          />
          <button type="submit" className="sr-only">
            Buscar
          </button>
          <CamposOcultos omitir={["q"]} />
        </form>
        <details className="relative shrink-0">
          <summary className={`${PRIMARY_BUTTON_CLASS} cursor-pointer list-none`}>
            <Plus size={16} strokeWidth={2.2} />
            Novo lançamento
          </summary>
          <form
            action={criarLancamento}
            className="absolute right-0 z-30 mt-2 max-h-[78vh] w-[min(calc(100vw-2rem),760px)] space-y-5 overflow-y-auto rounded-2xl border border-border/70 bg-surface p-5 shadow-xl"
          >
            <input type="hidden" name="tipo" value={tipo} />

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">1. Dados principais</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="descricao" required placeholder="Descrição" className={campoClasse} />
                <input name="valor" type="number" step="0.01" required placeholder="Valor (R$)" className={campoClasse} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select name="pessoa_id" defaultValue="" className={campoClasse}>
                  <option value="">{rotuloPessoa} (opcional)</option>
                  {(pessoas ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <select name="categoria_id" defaultValue="" className={campoClasse}>
                  <option value="">Categoria (opcional)</option>
                  {(categorias ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <select name="centro_custo_id" defaultValue="" className={campoClasse}>
                  <option value="">Centro de resultado (opcional)</option>
                  {(centros ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <select name="unidade_id" defaultValue="" className={campoClasse}>
                  <option value="">Unidade (opcional)</option>
                  {(unidades ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
                <select name="conta_bancaria_id" defaultValue="" className={campoClasse}>
                  <option value="">Conta bancária prevista (opcional)</option>
                  {(contas ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">2. Datas e pagamento</p>
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" name="recorrente" className="accent-brand" />
                <Repeat size={14} strokeWidth={2} />
                Isso é uma conta recorrente
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">
                    Vencimento (só pra lançamento avulso)
                  </label>
                  <input name="vencimento" type="date" className={campoClasse} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Competência (opcional)</label>
                  <input name="competencia" type="date" className={campoClasse} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="forma_pagamento" placeholder="Forma de pagamento (opcional)" className={campoClasse} />
                <input name="numero_documento" placeholder="Número do documento (opcional)" className={campoClasse} />
              </div>
            </div>

            <div className="space-y-3 rounded-lg bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                3. Recorrência (se marcou o campo acima)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <select name="frequencia" defaultValue="mensal" className={campoClasse}>
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Data da 1ª ocorrência</label>
                  <input name="data_inicio" type="date" className={campoClasse} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">
                    Repetir até (data final)
                  </label>
                  <input name="data_fim" type="date" className={campoClasse} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">
                    ...ou por quantas vezes
                  </label>
                  <input name="numero_ocorrencias" type="number" min={1} placeholder="Ex: 12" className={campoClasse} />
                </div>
              </div>
              <p className="text-[11px] text-ink-muted">
                Preencha &quot;repetir até&quot; OU &quot;quantas vezes&quot; — só precisa de um dos dois. As
                ocorrências já são criadas todas de uma vez (limite de 60 lançamentos por recorrência).
              </p>

              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-medium text-ink">Vencimento de cada ocorrência</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-ink">
                    <input type="radio" name="tipo_vencimento" value="fixo" defaultChecked className="accent-brand" />
                    Sempre no mesmo dia (usa a data da 1ª ocorrência)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-ink">
                    <input type="radio" name="tipo_vencimento" value="dia_util" className="accent-brand" />
                    Num dia útil do mês
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    name="dia_util"
                    type="number"
                    min={1}
                    max={23}
                    placeholder="Ex: 5"
                    className={`${campoClasse} max-w-[100px]`}
                  />
                  <span className="text-xs text-ink-muted">
                    º dia útil do mês (só vale se marcar a opção acima — a data da 1ª ocorrência
                    serve só pra indicar o mês/ano de início). Vale para mensal, trimestral, semestral
                    e anual; não se aplica à semanal.
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">4. Observações</p>
              <textarea name="observacoes" rows={2} placeholder="Observações (opcional)" className={campoClasse} />
            </div>

            <div className="flex justify-end border-t border-border/70 pt-4">
              <button type="submit" className={PRIMARY_BUTTON_CLASS}>
                Criar lançamento
              </button>
            </div>
          </form>
        </details>
      </div>

      <details className="group rounded-2xl border border-border/70 bg-surface shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-ink-muted">
              <SlidersHorizontal size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Filtros</p>
              <p className="truncate text-xs text-ink-muted">
                {temFiltro ? "Há filtros aplicados à lista." : "Refine por status, categoria, pessoa, conta, competência ou unidade."}
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-brand group-open:hidden">Abrir</span>
          <span className="hidden text-xs font-medium text-brand group-open:inline">Fechar</span>
        </summary>
        <form
          method="get"
          action={`${rota}#lista`}
          className="flex flex-wrap items-end gap-3 border-t border-border/70 px-4 py-4"
        >
        <input type="hidden" name="q" value={f.q ?? ""} />
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Status</label>
          <select name="status" defaultValue={f.status ?? ""} className={campoClasse}>
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="vencido">Vencido</option>
            <option value="recorrente">Recorrente</option>
            <option value="pago_parcial">Pago parcial</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
            {tipo === "receita" && <option value="sem_categoria">Sem categoria</option>}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Categoria</label>
          <select name="categoria" defaultValue={f.categoria ?? ""} className={campoClasse}>
            <option value="">Todas</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">{rotuloPessoa}</label>
          <select name="pessoa" defaultValue={f.pessoa ?? ""} className={campoClasse}>
            <option value="">Todos</option>
            {(pessoas ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Conta bancária</label>
          <select name="conta_bancaria" defaultValue={f.conta_bancaria ?? ""} className={campoClasse}>
            <option value="">Todas</option>
            {(contas ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Competência</label>
          <input name="competencia" type="month" defaultValue={f.competencia ?? ""} className={campoClasse} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Unidade</label>
          <select name="unidade" defaultValue={f.unidade ?? ""} className={campoClasse}>
            <option value="">Todas</option>
            {(unidades ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
        <input type="hidden" name="ordenar" value={f.ordenar ?? ""} />
        <input type="hidden" name="direcao" value={f.direcao ?? ""} />
        <input type="hidden" name="por_pagina" value={f.por_pagina ?? ""} />
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Filtrar
        </button>
        {temFiltro && (
          <a href={`${rota}#lista`} className="text-xs text-ink-muted hover:text-brand hover:underline">
            Limpar filtros
          </a>
        )}
        </form>
      </details>

      {lancamentos.length > 0 && (
        <form
          id="form-apagar-lote"
          action={apagarLancamentos}
          className="flex items-center justify-between rounded-xl border border-border/60 bg-surface px-4 py-2.5 text-xs text-ink-muted shadow-sm"
        >
          <span>Marque um ou mais lançamentos pendentes na tabela abaixo pra apagar de uma vez.</span>
          <button
            type="submit"
            className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
          >
            Apagar selecionados
          </button>
        </form>
      )}

      <div id="lista" className="scroll-mt-4 rounded-xl border border-border/60 bg-surface shadow-sm">
        {lancamentos.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            {temFiltro ? "Nenhum lançamento encontrado com esses filtros." : "Nenhum lançamento ainda."}
          </p>
        ) : (
          <>
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                  <th className="w-10 px-2 py-2.5">
                    <SelecionarTodos formId="form-apagar-lote" className="accent-brand" />
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    <Link href={linkOrdenar("descricao")} className="inline-flex items-center gap-1 hover:text-ink">
                      Descrição {iconeOrdenacao("descricao")}
                    </Link>
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                    <Link href={linkOrdenar("vencimento")} className="inline-flex items-center gap-1 hover:text-ink">
                      Vencimento {iconeOrdenacao("vencimento")}
                    </Link>
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    <Link href={linkOrdenar("valor")} className="inline-flex items-center gap-1 hover:text-ink">
                      Valor {iconeOrdenacao("valor")}
                    </Link>
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                    <Link href={linkOrdenar("status")} className="inline-flex items-center gap-1 hover:text-ink">
                      Status {iconeOrdenacao("status")}
                    </Link>
                  </th>
                  <th className="w-24 px-2 py-2.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lancamentosPagina.map((l) => {
                  const pessoa = l.financeiro_pessoas;
                  const categoria = l.financeiro_categorias;
                  const conta = l.financeiro_contas_bancarias;
                  const restante = Number(l.valor) - (baixadoPorLancamento.get(l.id) ?? 0);
                  const editavel = l.status === "pendente" || l.status === "pago_parcial";
                  const estado = estadoExibicao(l, hoje);
                  return (
                    <tr key={l.id}>
                      <td className="px-4 py-2.5">
                        {l.status === "pendente" && (
                          <input type="checkbox" name="ids" value={l.id} form="form-apagar-lote" className="accent-brand" />
                        )}
                      </td>

                      <td className="px-4 py-3 text-ink">
                        <div className="font-medium">{l.descricao} {l.recorrencia_id && <Repeat size={12} className="inline text-ink-muted" />}</div>
                        <div className="mt-1 text-xs text-ink-muted">
                          {[pessoa?.nome, categoria?.nome ?? "Sem categoria", conta?.nome].filter(Boolean).join(" · ")}
                        </div>
                        <div className="mt-1 text-xs text-ink-muted md:hidden">{dataBR(l.vencimento)} · {ESTADO_ROTULO[estado]}</div>
                      </td>
                      <td className="hidden px-4 py-2.5 text-ink-muted md:table-cell">{dataBR(l.vencimento)}</td>
                      <td className="num w-28 px-2 py-2.5 text-right text-xs font-medium text-ink sm:text-sm">{brl(l.valor)}</td>
                      <td className="hidden px-4 py-2.5 md:table-cell">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${ESTADO_TEXTO[estado]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_COR[estado]}`} />
                          {ESTADO_ROTULO[estado]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <details className="relative">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-ink hover:bg-background" aria-label={`Ações para ${l.descricao}`}>
                            <MoreHorizontal size={16} /> Ações
                          </summary>
                          <div className="absolute right-0 z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] space-y-2 rounded-xl border border-border bg-surface p-3 shadow-lg">
                          {tipo === "receita" && !l.categoria_id && (l.status === "pago" || l.status === "pago_parcial") && (
                            <details className="relative">
                              <summary
                                className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-xs text-amber-600 hover:bg-background"
                                aria-label="Categorizar agora"
                                title="Categorizar agora"
                              >
                                <Tag size={15} strokeWidth={2} /> Categorizar
                              </summary>
                              <form
                                action={categorizarLancamento}
                                className="mt-2 w-full space-y-2 rounded-md border border-border bg-background p-3"
                              >
                                <input type="hidden" name="id" value={l.id} />
                                <p className="text-xs font-medium text-ink">Categorizar agora</p>
                                <select
                                  name="categoria_id"
                                  required
                                  defaultValue=""
                                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                >
                                  <option value="" disabled>
                                    Selecione a categoria...
                                  </option>
                                  {(categorias ?? []).map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.nome}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  name="centro_custo_id"
                                  defaultValue=""
                                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                >
                                  <option value="">Centro de resultado (opcional)</option>
                                  {(centros ?? []).map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.nome}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="submit"
                                  className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                                >
                                  Salvar categoria
                                </button>
                              </form>
                            </details>
                          )}
                          {editavel && (
                            <details className="relative">
                              <summary
                                className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-xs text-ink-muted hover:bg-background hover:text-brand"
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Pencil size={15} strokeWidth={2} /> Editar
                              </summary>
                              <form
                                action={editarLancamento}
                                className="mt-2 w-full space-y-2 rounded-md border border-border bg-background p-3"
                              >
                                <input type="hidden" name="id" value={l.id} />
                                <input
                                  name="descricao"
                                  defaultValue={l.descricao}
                                  required
                                  placeholder="Descrição"
                                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                />
                                <input
                                  name="valor"
                                  type="number"
                                  step="0.01"
                                  defaultValue={l.valor}
                                  required
                                  placeholder="Valor"
                                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                />
                                <input
                                  name="vencimento"
                                  type="date"
                                  defaultValue={l.vencimento}
                                  required
                                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                />
                                <input
                                  name="competencia"
                                  type="date"
                                  defaultValue={l.competencia ?? l.vencimento}
                                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                />
                                <select
                                  name="pessoa_id"
                                  defaultValue={l.pessoa_id ?? ""}
                                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                >
                                  <option value="">{rotuloPessoa} (opcional)</option>
                                  {(pessoas ?? []).map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.nome}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  name="categoria_id"
                                  defaultValue={l.categoria_id ?? ""}
                                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                >
                                  <option value="">Categoria (opcional)</option>
                                  {(categorias ?? []).map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.nome}
                                    </option>
                                  ))}
                                </select>
                                {l.recorrencia_id && (
                                  <div className="space-y-1 rounded-md bg-background p-2">
                                    <p className="text-[10px] font-medium text-ink-muted">
                                      Faz parte de uma recorrência. Aplicar a:
                                    </p>
                                    <label className="flex items-center gap-1.5 text-[11px] text-ink">
                                      <input type="radio" name="escopo" value="um" defaultChecked className="accent-brand" />
                                      Somente este lançamento
                                    </label>
                                    <label className="flex items-center gap-1.5 text-[11px] text-ink">
                                      <input type="radio" name="escopo" value="todos_futuros" className="accent-brand" />
                                      Este e todos os futuros da recorrência
                                    </label>
                                    <p className="text-[10px] text-ink-muted">
                                      Nesse caso o vencimento de cada ocorrência é mantido — só descrição, valor,
                                      categoria e demais dados cadastrais são replicados.
                                    </p>
                                  </div>
                                )}
                                <button
                                  type="submit"
                                  className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                                >
                                  Salvar alterações
                                </button>
                              </form>
                            </details>
                          )}
                          {l.status !== "pago" && l.status !== "cancelado" && (
                            <>
                              <details className="relative">
                                <summary
                                  className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-xs text-brand hover:bg-background"
                                  aria-label={tipo === "receita" ? "Receber" : "Pagar"}
                                  title={tipo === "receita" ? "Receber" : "Pagar"}
                                >
                                  <CheckCircle2 size={15} strokeWidth={2} /> {tipo === "receita" ? "Receber" : "Pagar"}
                                </summary>
                                <form
                                  action={registrarBaixa}
                                  className="mt-2 w-full space-y-2 rounded-md border border-border bg-background p-3"
                                >
                                  <input type="hidden" name="lancamento_id" value={l.id} />
                                  <p className="text-xs text-ink-muted">Restante: {brl(restante)}</p>
                                  <input
                                    name="valor"
                                    type="number"
                                    step="0.01"
                                    required
                                    defaultValue={restante}
                                    placeholder="Valor"
                                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                  />
                                  <input
                                    name="data"
                                    type="date"
                                    required
                                    defaultValue={new Date().toISOString().slice(0, 10)}
                                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                  />
                                  <select
                                    name="conta_bancaria_id"
                                    defaultValue=""
                                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                  >
                                    <option value="">Conta bancária</option>
                                    {(contas ?? []).map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.nome}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="submit"
                                    className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                                  >
                                    Confirmar
                                  </button>
                                </form>
                              </details>
                              <form action={cancelarLancamento}>
                                <input type="hidden" name="id" value={l.id} />
                                <button
                                  type="submit"
                                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-ink-muted hover:bg-background hover:text-rose-600"
                                  aria-label="Cancelar"
                                  title="Cancelar"
                                >
                                  <Ban size={15} strokeWidth={2} /> Cancelar
                                </button>
                              </form>
                            </>
                          )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-ink-muted">
              <span>
                Mostrando {totalItens === 0 ? 0 : inicioPagina + 1} a {Math.min(inicioPagina + porPagina, totalItens)} de{" "}
                {totalItens} lançamentos
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Link
                    href={construirUrl(rota, { ...f, pagina: String(Math.max(1, paginaAtual - 1)) })}
                    aria-disabled={paginaAtual === 1}
                    className={`rounded-md border border-border p-1.5 ${
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
                          className={`rounded-md border px-2.5 py-1 ${
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
                    aria-disabled={paginaAtual === totalPaginas}
                    className={`rounded-md border border-border p-1.5 ${
                      paginaAtual === totalPaginas ? "pointer-events-none opacity-40" : "hover:bg-background"
                    }`}
                  >
                    <ChevronRight size={14} />
                  </Link>
                </div>
                <form method="get" action={`${rota}#lista`} className="flex items-center gap-1.5">
                  <CamposOcultos omitir={["por_pagina"]} />
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
