import { NavegacaoSecoes } from "@/components/navegacao-secoes";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  TIPO_CONTA_LABEL,
  RESPONSAVEL_PAGAMENTO_LABEL,
  type TipoContaLocacao,
  type StatusContaLocacao,
  type ResponsavelPagamentoLocacao,
  type RescisaoEtapa,
  type RescisaoChecklistItem,
} from "@/lib/types";
import {
  alternarStatusConta,
  atualizarDetalhesConta,
  atualizarContrato,
  encerrarContrato,
  reativarContrato,
} from "./actions";
import {
  iniciarRescisao,
  alternarChecklistItemRescisao,
  concluirEtapaRescisao,
  reabrirEtapaRescisao,
} from "./rescisao-actions";
import { SucessoBanner } from "@/components/banners";
import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import { hojeISO } from "@/lib/data-br";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { apagarContrato } from "../bulk-actions";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { CheckCircle2, Clock, AlertTriangle, FileWarning, FileText, Calendar } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { INPUT_CLASS } from "@/components/ui/styles";
import { CartaoIndicador } from "@/components/cartao-indicador";
import { BotaoEnviar } from "@/components/botao-enviar";
import { SecaoCondominio } from "../debitos/_componentes/secao-condominio";

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const TIPOS: TipoContaLocacao[] = ["iptu", "condominio"];

type EstadoVisual = "pago" | "em_dia" | "vencido" | "nao_aplicavel";

const ESTADO_CHECKBOX: Record<EstadoVisual, string> = {
  pago: "border-emerald-500 bg-emerald-500 text-white",
  em_dia: "border-amber-400 border-2 bg-surface text-amber-400",
  vencido: "border-rose-500 border-2 bg-surface text-rose-500",
  nao_aplicavel: "border-border-strong border-2 bg-surface text-transparent",
};

function IconeContaCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 6.5L4.5 9L10 3"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * "Pendente" sozinho não conta a história certa: se ainda não
 * venceu, não é pra parecer um alarme. Só vira "vencido" (vermelho)
 * quando o dia do vencimento já passou.
 */
function calcularEstadoVisual(
  status: StatusContaLocacao,
  vencimento: string | null | undefined
): EstadoVisual {
  if (status !== "pendente") return status;
  if (!vencimento) return "em_dia";
  const hoje = hojeISO();
  return vencimento < hoje ? "vencido" : "em_dia";
}

export default async function ContratoLocacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ano?: string; salvo?: string }>;
}) {
  const { id } = await params;
  const { ano: anoParam, salvo } = await searchParams;
  const ano = Number(anoParam) || Number(hojeISO().slice(0, 4));

  const supabase = await createClient();

  const inicioAno = `${ano}-01-01`;
  const fimAno = `${ano}-12-01`;

  // Contrato, rescisão em andamento e contas do ano dependem só do id —
  // vão juntos ao banco, em vez de um esperar o outro.
  const [{ data: contrato }, { data: rescisaoAtiva }, { data: contasRaw }] = await Promise.all([
    supabase
      .from("contratos_locacao")
      .select(
        `*, imoveis ( endereco ),
         locador:clientes!contratos_locacao_locador_id_fkey ( nome, telefone, email ),
         locatario:clientes!contratos_locacao_locatario_id_fkey ( nome, telefone, email )`
      )
      .eq("id", id)
      .single(),
    supabase
      .from("rescisoes_locacao")
      .select("*")
      .eq("contrato_id", id)
      .eq("status", "em_andamento")
      .maybeSingle(),
    supabase
      .from("contas_locacao")
      .select("*")
      .eq("contrato_id", id)
      .gte("competencia", inicioAno)
      .lte("competencia", fimAno),
  ]);

  if (!contrato) notFound();

  type Contrato = typeof contrato & {
    imoveis: { endereco: string } | null;
    locador: { nome: string; telefone: string | null; email: string | null } | null;
    locatario: { nome: string; telefone: string | null; email: string | null } | null;
  };
  const c = contrato as unknown as Contrato;

  const RESPONSAVEL_POR_TIPO: Record<TipoContaLocacao, ResponsavelPagamentoLocacao | null> = {
    iptu: c.responsavel_iptu,
    condominio: c.responsavel_condominio,
    agua: c.responsavel_agua,
    luz: c.responsavel_luz,
    gas: c.responsavel_gas,
  };

  let rescisaoEtapas: RescisaoEtapa[] = [];
  let rescisaoChecklist: RescisaoChecklistItem[] = [];
  if (rescisaoAtiva) {
    const { data: etapasData } = await supabase
      .from("rescisao_etapas")
      .select("*")
      .eq("rescisao_id", rescisaoAtiva.id)
      .order("ordem", { ascending: true });
    rescisaoEtapas = (etapasData ?? []) as RescisaoEtapa[]; // status é texto livre no banco

    const etapaIdsRescisao = rescisaoEtapas.map((e) => e.id);
    if (etapaIdsRescisao.length > 0) {
      const { data: checklistData } = await supabase
        .from("rescisao_checklist_itens")
        .select("*")
        .in("etapa_id", etapaIdsRescisao)
        .order("ordem", { ascending: true });
      rescisaoChecklist = checklistData ?? [];
    }
  }

  const contasPorChave = new Map((contasRaw ?? []).map((cc) => [`${cc.tipo}-${cc.competencia}`, cc]));

  const contasComDados = (contasRaw ?? []).filter((cc) => cc.status !== "nao_aplicavel");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <NavegacaoSecoes secoes={[
        { id: "resumo-contrato", label: "Resumo" }, { id: "contas-contrato", label: "Contas" },
        { id: "condominio-contrato", label: "Condomínio" }, { id: "dados-contrato", label: "Dados e responsáveis" },
        { id: "rescisao-contrato", label: "Rescisão" }, { id: "gestao-contrato", label: "Gestão do contrato" },
      ]} />
      <div id="resumo-contrato" className="scroll-mt-20 rounded-2xl border border-border/70 bg-surface p-6 shadow-sm">
        <VoltarLink href="/locacao?aba=contratos" label="Contratos de Locação" />
        <SucessoBanner mostrar={salvo === "1"} texto="Contrato salvo com sucesso." />
        <CabecalhoPagina titulo={c.imoveis?.endereco ?? c.numero ?? "Sem imóvel definido"} descricao={`Contrato ${c.numero}`} acao={
          <div className="flex flex-wrap items-center gap-2">
            {rescisaoAtiva && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                Em rescisão
              </span>
            )}
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                c.ativo
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-stone-200 bg-stone-100 text-stone-500"
              }`}
            >
              {c.ativo ? "Ativo" : `Encerrado${c.data_encerramento ? " em " + new Date(c.data_encerramento + "T00:00:00").toLocaleDateString("pt-BR") : ""}`}
            </span>
          </div>
        } />

        <div className="mt-4 grid gap-4 rounded-xl border border-border/60 bg-surface p-4 shadow-sm sm:grid-cols-3">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Locador
            </p>
            <p className="text-sm font-medium text-ink">{c.locador?.nome ?? "—"}</p>
            {c.locador?.telefone && <p className="text-xs text-ink-muted">{c.locador.telefone}</p>}
            {c.locador?.email && <p className="break-all text-xs text-ink-muted">{c.locador.email}</p>}
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Locatário
            </p>
            <p className="text-sm font-medium text-ink">{c.locatario?.nome ?? "—"}</p>
            {c.locatario?.telefone && <p className="text-xs text-ink-muted">{c.locatario.telefone}</p>}
            {c.locatario?.email && <p className="break-all text-xs text-ink-muted">{c.locatario.email}</p>}
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Emite NF
            </p>
            <p className="text-sm font-medium text-ink">{c.emite_nf ? "Sim" : "Não"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo das contas do ano">
        <CartaoIndicador compacto icon={Calendar} valor={contasComDados.length} label={`Contas em ${ano}`} />
        <CartaoIndicador compacto icon={CheckCircle2} valor={contasComDados.filter(cc => cc.status === "pago").length} label="Pagas" tom="sucesso" />
        <CartaoIndicador compacto icon={AlertTriangle} valor={contasComDados.filter(cc => calcularEstadoVisual(cc.status as StatusContaLocacao, cc.vencimento) === "vencido").length} label="Vencidas" tom="perigo" />
        <CartaoIndicador compacto icon={Clock} valor={contasComDados.filter(cc => calcularEstadoVisual(cc.status as StatusContaLocacao, cc.vencimento) === "em_dia").length} label="Pendentes sem atraso" tom="alerta" />
      </div>
      {/* Grid de contas */}
      <section id="contas-contrato" className="scroll-mt-20">
        <CabecalhoSecao
          icon={Calendar}
          titulo={`Contas — ${ano}`}
          acao={
            <div className="flex gap-1 text-xs">
              <a
                href={`/locacao/${id}?ano=${ano - 1}`}
                className="rounded-md border border-border px-2 py-1 text-ink-muted hover:bg-background"
              >
                ← {ano - 1}
              </a>
              <a
                href={`/locacao/${id}?ano=${ano + 1}`}
                className="rounded-md border border-border px-2 py-1 text-ink-muted hover:bg-background"
              >
                {ano + 1} →
              </a>
            </div>
          }
        />

        <p className="mb-3 text-xs text-ink-muted">
          Toque em uma conta para marcar como paga ou desfazer a marcação. No celular, deslize a tabela para ver os demais meses.
        </p>

        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted" aria-label="Legenda das contas">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-emerald-500 bg-emerald-500" />Paga</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border-2 border-rose-500" />Vencida</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border-2 border-amber-400" />Pendente sem atraso</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border-2 border-border-strong" />Não aplicável</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-surface shadow-sm p-2">
          <table className="w-full min-w-[760px] border-separate" style={{ borderSpacing: "3px" }}>
            <thead>
              <tr className="text-ink-muted">
                <th className="sticky left-0 z-10 bg-surface px-2 py-1 text-left text-xs font-medium">Conta</th>
                {MESES.map((m) => (
                  <th key={m} className="min-w-11 py-1 text-center text-xs font-medium">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIPOS.map((tipo) => {
                const responsavel = RESPONSAVEL_POR_TIPO[tipo];
                return (
                  <tr key={tipo}>
                    <td className="sticky left-0 z-10 min-w-28 bg-surface px-2 py-1 text-sm font-medium text-ink">
                      {TIPO_CONTA_LABEL[tipo]}
                      {responsavel && (
                        <span className="ml-1.5 rounded border border-border bg-background px-1 py-0.5 text-[9px] font-normal uppercase tracking-wide text-ink-muted">
                          {RESPONSAVEL_PAGAMENTO_LABEL[responsavel]}
                        </span>
                      )}
                    </td>
                    {MESES.map((_, mesIdx) => {
                      const competencia = `${ano}-${String(mesIdx + 1).padStart(2, "0")}-01`;
                      const conta = contasPorChave.get(`${tipo}-${competencia}`);
                      const status = (conta?.status ?? "nao_aplicavel") as StatusContaLocacao;
                      const estado = calcularEstadoVisual(status, conta?.vencimento);
                      return (
                        <td key={mesIdx} className="p-0 text-center">
                          <form action={alternarStatusConta}>
                            <input type="hidden" name="contrato_id" value={id} />
                            <input type="hidden" name="tipo" value={tipo} />
                            <input type="hidden" name="competencia" value={competencia} />
                            <input type="hidden" name="status_atual" value={status} />
                            {conta && <input type="hidden" name="conta_id" value={conta.id} />}
                            <BotaoEnviar
                              title={`${TIPO_CONTA_LABEL[tipo]} — ${MESES[mesIdx]}/${ano}${
                                estado === "em_dia" ? " (em dia)" : estado === "vencido" ? " (vencido)" : ""
                              }`}
                              className="flex h-10 w-full items-center justify-center rounded-md transition hover:bg-background active:scale-95"
                            >
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-[5px] transition-colors ${ESTADO_CHECKBOX[estado]}`}
                              >
                                {estado === "pago" && <IconeContaCheck />}
                              </span>
                            </BotaoEnviar>
                          </form>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detalhes editáveis (valor/vencimento) das contas com status definido */}
      {contasComDados.length > 0 && (
        <details className="group rounded-xl border border-border/60 bg-surface shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold text-ink">
            Valores e vencimentos
            <span className="text-xs font-normal text-ink-muted group-open:hidden">
              mostrar ({contasComDados.length})
            </span>
            <span className="hidden text-xs font-normal text-ink-muted group-open:inline">ocultar</span>
          </summary>
          <div className="overflow-x-auto border-t border-border">
            <table className="block w-full text-sm md:table">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">Conta</th>
                  <th className="px-4 py-2.5 font-medium">Mês</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Valor e vencimento</th>
                </tr>
              </thead>
              <tbody className="block divide-y divide-border md:table-row-group">
                {contasComDados
                  .sort((a, b) => a.competencia.localeCompare(b.competencia))
                  .map((cc) => (
                    <tr key={cc.id} className="grid grid-cols-2 gap-1 p-3 md:table-row md:p-0">
                      <td className="px-4 py-2 text-ink">{TIPO_CONTA_LABEL[cc.tipo as TipoContaLocacao]}</td>
                      <td className="px-4 py-2 text-ink-muted">
                        {new Date(cc.competencia + "T00:00:00").toLocaleDateString("pt-BR", {
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="col-span-2 px-4 py-2">
                        {(() => {
                          const estado = calcularEstadoVisual(
                            cc.status as StatusContaLocacao,
                            cc.vencimento
                          );
                          const texto =
                            estado === "pago" ? "Pago" : estado === "vencido" ? "Vencido" : "Pendente sem atraso";
                          const cor =
                            estado === "pago"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : estado === "vencido"
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-amber-200 bg-amber-50 text-amber-700";
                          return (
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cor}`}>
                              {texto}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="col-span-2 px-4 py-2">
                        <form action={atualizarDetalhesConta} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="conta_id" value={cc.id} />
                          <input type="hidden" name="contrato_id" value={id} />
                          <label htmlFor={`conta-valor-${cc.id}`} className="sr-only">Valor da conta</label>
                          <CampoMoeda
                            id={`conta-valor-${cc.id}`} name="valor"
                            defaultValue={cc.valor ?? undefined}
                            className={`${INPUT_CLASS} min-h-11 !w-28 !text-base md:!text-sm`}
                          />
                          <input
                            aria-label="Vencimento da conta" name="vencimento"
                            type="date"
                            defaultValue={cc.vencimento ?? ""}
                            className={`${INPUT_CLASS} min-h-11 min-w-0 !w-auto !text-base md:!text-sm`}
                          />
                          <BotaoEnviar
                            className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-ink-muted hover:bg-background"
                          >
                            Salvar
                          </BotaoEnviar>
                        </form>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <section id="condominio-contrato" className="scroll-mt-20"><SecaoCondominio contratoId={id} /></section>

      {/* Dados do contrato */}
      <section id="dados-contrato" className="scroll-mt-20">
        <CabecalhoSecao icon={FileText} titulo="Dados do contrato" />
        <form action={atualizarContrato} className="space-y-4 rounded-xl border border-border/60 bg-surface shadow-sm p-5">
          <input type="hidden" name="id" value={id} />

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Número</label>
            <input
              name="numero"
              defaultValue={c.numero}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Locador</label>
              <input
                name="locador_nome"
                defaultValue={c.locador?.nome ?? ""}
                list="lista-clientes-locacao"
                placeholder="Digite ou escolha um nome"
                autoComplete="off"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Locatário</label>
              <input
                name="locatario_nome"
                defaultValue={c.locatario?.nome ?? ""}
                list="lista-clientes-locacao"
                placeholder="Digite ou escolha um nome"
                autoComplete="off"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Inscrição IPTU/TLP
              </label>
              <input
                name="iptu_inscricao"
                defaultValue={c.iptu_inscricao ?? ""}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Tipo de IPTU</label>
              <select
                name="iptu_tipo"
                defaultValue={c.iptu_tipo ?? ""}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="">—</option>
                <option value="parcelado">Parcelado</option>
                <option value="cota_unica">Cota única</option>
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
              <input type="checkbox" name="emite_nf" defaultChecked={c.emite_nf} className="accent-brand" />
              Emite NF
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Administradora do condomínio
              </label>
              <input
                name="condominio_administradora"
                defaultValue={c.condominio_administradora ?? ""}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Contato do condomínio
              </label>
              <input
                name="condominio_contato"
                defaultValue={c.condominio_contato ?? ""}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-3">
            <p className="mb-2 text-xs font-medium text-ink-muted">
              Portal da administradora (se ela disponibilizar acesso pra consultar
              inadimplências)
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Link do site
                </label>
                <input
                  name="portal_administradora_url"
                  defaultValue={c.portal_administradora_url ?? ""}
                  placeholder="https://..."
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Login</label>
                <input
                  name="portal_administradora_login"
                  defaultValue={c.portal_administradora_login ?? ""}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Senha</label>
                <input
                  name="portal_administradora_senha"
                  defaultValue={c.portal_administradora_senha ?? ""}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
            {c.portal_administradora_url && (
              <a
                href={c.portal_administradora_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-brand hover:underline"
              >
                Abrir portal da administradora →
              </a>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-ink-muted">
              Quem paga cada conta neste contrato
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <ResponsavelSelect label="IPTU / TLP" name="responsavel_iptu" value={c.responsavel_iptu} />
              <ResponsavelSelect
                label="Condomínio"
                name="responsavel_condominio"
                value={c.responsavel_condominio}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Observações</label>
            <textarea
              name="observacoes"
              defaultValue={c.observacoes ?? ""}
              rows={3}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <BotaoEnviar
            className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Salvar contrato
          </BotaoEnviar>
        </form>

        <datalist id="lista-clientes-locacao">
          {[c.locador?.nome, c.locatario?.nome].filter(Boolean).map((n) => (
            <option key={n} value={n!} />
          ))}
        </datalist>

      </section>

      {/* Rescisão */}
      <section id="rescisao-contrato" className="scroll-mt-20">
        {rescisaoAtiva ? (
          <div className="rounded-xl border border-border/60 bg-surface shadow-sm p-5">
            <div className="mb-1">
              <CabecalhoSecao
                icon={FileWarning}
                titulo="Rescisão do contrato"
                acao={
                  <span className="text-xs text-ink-muted">
                    {rescisaoEtapas.filter((e) => e.status === "concluida").length} de{" "}
                    {rescisaoEtapas.length} etapas concluídas
                  </span>
                }
              />
            </div>
            <p className="mb-4 text-xs text-ink-muted">
              Aviso recebido em{" "}
              {new Date(rescisaoAtiva.data_aviso + "T00:00:00").toLocaleDateString("pt-BR")}
            </p>

            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Mantenha contato pelo menos uma vez por semana com o inquilino e com o
              proprietário durante todo o processo, atualizando os dois sobre o andamento.
            </div>

            <div className="space-y-3">
              {rescisaoEtapas.map((etapa) => {
                const itensEtapa = rescisaoChecklist.filter((it) => it.etapa_id === etapa.id);
                return (
                  <div
                    key={etapa.id}
                    className="rounded-lg border border-border/60 bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-ink">
                        {etapa.ordem}. {etapa.nome}
                      </p>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                          etapa.status === "concluida"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-border-strong bg-surface text-ink-muted"
                        }`}
                      >
                        {etapa.status === "concluida"
                          ? `Concluída${etapa.data_realizada ? " em " + new Date(etapa.data_realizada + "T00:00:00").toLocaleDateString("pt-BR") : ""}`
                          : "Pendente"}
                      </span>
                    </div>

                    {etapa.nome === "Vistoria de saída" && (
                      <p className="mt-1.5 text-[11px] text-ink-muted">
                        Se a vistoria apontar reparos necessários, conclua marcando os itens
                        abaixo e depois reabra esta etapa quando precisar de uma nova rodada de
                        vistoria — o ciclo se repete até o imóvel ser aceito.
                      </p>
                    )}

                    {itensEtapa.length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                        {itensEtapa.map((item) => (
                          <li key={item.id} className="flex items-center gap-2 text-sm">
                            <form action={alternarChecklistItemRescisao}>
                              <input type="hidden" name="item_id" value={item.id} />
                              <input type="hidden" name="contrato_id" value={id} />
                              <input
                                type="hidden"
                                name="concluido_atual"
                                value={String(item.concluido)}
                              />
                              <BotaoEnviar className="flex min-h-11 items-center gap-3 text-left">
                                <span
                                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${
                                    item.concluido
                                      ? "border-brand bg-brand text-white"
                                      : "border-border-strong bg-surface"
                                  }`}
                                >
                                  {item.concluido && (
                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                      <path
                                        d="M2 6.5L4.5 9L10 3"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  )}
                                </span>
                                <span
                                  className={
                                    item.concluido ? "text-ink-muted line-through" : "text-ink"
                                  }
                                >
                                  {item.descricao}
                                </span>
                              </BotaoEnviar>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 border-t border-border pt-3">
                      {etapa.status !== "concluida" ? (
                        <form action={concluirEtapaRescisao}>
                          <input type="hidden" name="etapa_id" value={etapa.id} />
                          <input type="hidden" name="rescisao_id" value={rescisaoAtiva.id} />
                          <input type="hidden" name="contrato_id" value={id} />
                          <BotaoEnviar
                            className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                          >
                            Concluir etapa
                          </BotaoEnviar>
                        </form>
                      ) : (
                        <form action={reabrirEtapaRescisao}>
                          <input type="hidden" name="etapa_id" value={etapa.id} />
                          <input type="hidden" name="rescisao_id" value={rescisaoAtiva.id} />
                          <input type="hidden" name="contrato_id" value={id} />
                          <BotaoEnviar
                            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-background"
                          >
                            Reabrir
                          </BotaoEnviar>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-surface shadow-sm p-5">
            <CabecalhoSecao
              icon={FileWarning}
              titulo="Rescisão do contrato"
              descricao="Use quando o inquilino avisar (por e-mail, de preferência) que vai encerrar o contrato. Isso cria o passo a passo completo pra acompanhar, do aviso até a entrega do imóvel."
            />
            <form action={iniciarRescisao} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="contrato_id" value={id} />
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Data do aviso
                </label>
                <input
                  type="date"
                  name="data_aviso"
                  defaultValue={hojeISO()}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <BotaoEnviar
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Iniciar rescisão
              </BotaoEnviar>
            </form>
          </div>
        )}
      </section>

      <section id="gestao-contrato" className="scroll-mt-20 rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <CabecalhoSecao icon={FileText} titulo="Gestão do contrato" />
          {c.ativo ? (
            <>
              <p className="mb-2 text-xs text-ink-muted">
                Encerrar move esse contrato pra uma área separada de contratos encerrados —
                não apaga nada, dá pra reativar depois.
              </p>
              <form action={encerrarContrato}>
                <input type="hidden" name="id" value={id} />
                <BotaoEnviar
                  className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                >
                  Encerrar contrato
                </BotaoEnviar>
              </form>
            </>
          ) : (
            <form action={reativarContrato}>
              <input type="hidden" name="id" value={id} />
              <BotaoEnviar
                className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Reativar contrato
              </BotaoEnviar>
            </form>
          )}
      </section>

      <form action={apagarContrato}>
        <input type="hidden" name="id" value={id} />
        <BotaoComConfirmacao
          mensagem="Apagar este contrato? Essa ação não pode ser desfeita."
          className="text-xs font-medium text-ink-muted hover:text-rose-600"
        >
          Apagar contrato
        </BotaoComConfirmacao>
      </form>
    </div>
  );
}

function ResponsavelSelect({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: ResponsavelPagamentoLocacao | null;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-muted">{label}</label>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
      >
        <option value="">—</option>
        <option value="locador">Locador</option>
        <option value="locatario">Locatário</option>
        <option value="imobiliaria">Imobiliária</option>
      </select>
    </div>
  );
}
