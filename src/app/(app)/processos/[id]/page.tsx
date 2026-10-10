import { NavegacaoSecoes } from "@/components/navegacao-secoes";
import { corretoresComissao } from "@/lib/corretores-comissao";
import { HISTORICO_VGV } from "../../painel-sacra/dados";
import { AtualizacoesCorretor } from "../../minhas-vendas/atualizacoes-equipe";
import { identificacaoProcesso } from "@/lib/identificacao-processo";
import type { Etapa } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { anexarUrgencia, URGENCIA_COR, formatarPrazo } from "@/lib/alertas";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { VoltarLink } from "@/components/voltar-link";
import { AtalhoTermoEntrega } from "../../vendas/termos-entrega/atalho";
import { CampoMoeda } from "@/components/campo-moeda";
import { BotaoExportarLinhaTempo } from "@/components/botao-exportar-linha-tempo";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { BotaoSubmit } from "@/components/botao-submit";
import { apagarProcesso } from "../bulk-actions";
import {
  concluirEtapa,
  reabrirEtapa,
  alterarDataPrevista,
  alternarChecklistItem,
  alternarEtapaPadrao,
  salvarComissao,
  adicionarComentario,
  salvarNumeroRegistro,
  salvarDadosProcesso,
} from "./actions";
import { EditorLinhaTempo } from "@/components/editor-linha-tempo";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import {
  MessageSquare,
  History,
  CalendarDays,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { ModalEdicaoProcesso } from "@/components/modal-edicao-processo";

export default async function ProcessoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 1ª rodada: tudo que só depende do id do processo, em paralelo
  // (antes eram 10 consultas em fila).
  const [
    { data: processo },
    { data: comissoes },
    { data: corretoresLista },
    { data: bancosLista },
    { data: usuariosLista },
    { data: etapasRaw },
    { data: comentarios },
    { data: historico },
  ] = await Promise.all([
    supabase
      .from("processos")
      .select(
        `id, numero_processo, codigo_san, numero_proposta_contrato, status, valor_total, valor_financiado, origem, categoria, data_criacao,
         data_assinatura, data_final_contrato, imovel_id, participacao_vgv_revisada,
         comprador:clientes!processos_comprador_id_fkey ( nome, telefone ),
         vendedor:clientes!processos_vendedor_id_fkey ( nome, telefone ),
         imoveis ( endereco ), bancos ( nome ),
         corretores!processos_corretor_id_fkey ( nome ), usuarios ( nome ), modelos_processo ( nome ),
         captador:corretores!processos_captador_id_fkey ( nome ),
         indicacao:corretores!processos_indicacao_id_fkey ( nome )`
      )
      .eq("id", id)
      .single(),
    supabase
      .from("comissoes")
      .select("*, corretores!comissoes_beneficiario_id_fkey ( nome )")
      .eq("processo_id", id)
      .order("criado_em", { ascending: true }),
    supabase.from("corretores").select("id, nome").order("nome"),
    supabase.from("bancos").select("id, nome").order("nome"),
    supabase.from("usuarios").select("id, nome").eq("ativo", true).order("nome"),
    supabase
      .from("etapas")
      .select("*, usuarios ( nome )")
      .eq("processo_id", id)
      .order("ordem", { ascending: true }),
    supabase
      .from("comentarios")
      .select("*, usuarios ( nome )")
      .eq("processo_id", id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("historico")
      .select("*, usuarios ( nome )")
      .eq("processo_id", id)
      .order("criado_em", { ascending: false })
      .limit(20),
  ]);

  if (!processo) notFound();

  const etapas = anexarUrgencia((etapasRaw ?? []) as Etapa[]); // status é texto livre no banco
  const etapaIds = (etapasRaw ?? []).map((e) => e.id);

  // 2ª rodada: o que depende da categoria do processo e dos ids das etapas.
  const [{ data: etapasPadrao }, { data: checklistItens }] = await Promise.all([
    supabase
      .from("etapas_padrao")
      .select("id, nome, ordem, categoria, tipo")
      .eq("categoria", processo.categoria)
      .order("ordem", { ascending: true }),
    etapaIds.length
      ? supabase.from("checklist_itens").select("*").in("etapa_id", etapaIds).order("ordem")
      : Promise.resolve({ data: [] }),
  ]);

  type P = typeof processo & {
    comprador: { nome: string; telefone: string | null } | null;
    vendedor: { nome: string; telefone: string | null } | null;
    imoveis: { endereco: string } | null;
    bancos: { nome: string } | null;
    corretores: { nome: string } | null;
    usuarios: { nome: string } | null;
    modelos_processo: { nome: string } | null;
    indicacao: { nome: string } | null;
    categoria: string;
    valor_financiado: number | null;
    origem: string | null;
    data_assinatura: string | null;
    data_final_contrato: string | null;
    imovel_id: string | null;
    codigo_san: string | null;
    numero_proposta_contrato: string | null;
  };
  const p = processo as unknown as P;
  const participacaoHistorica = !p.participacao_vgv_revisada ? HISTORICO_VGV.find(h => h.processoId === p.id)?.participantesIds : undefined;
  const nomeHistorico = (indice: number) => corretoresLista?.find(c => c.id === participacaoHistorica?.[indice])?.nome;
  const captadorExibido = p.captador?.nome ?? nomeHistorico(0);
  const vendedorExibido = p.corretores?.nome ?? nomeHistorico((participacaoHistorica?.length ?? 1) - 1);
  const ehFinanciamento = p.categoria === "financiamento";

  const etapasPadraoSequencial = (etapasPadrao ?? []).filter((ep) => ep.tipo === "sequencial");
  const etapasPadraoEspecial = (etapasPadrao ?? []).filter((ep) => ep.tipo === "especial");

  const etapasSequenciais = etapas.filter((e) => !e.especial);
  const etapasEspeciaisAtivas = etapas.filter((e) => e.especial);
  const etapasConcluidas = etapasSequenciais.filter((e) => e.status === "concluida").length;
  const etapasAtrasadas = etapasSequenciais.filter((e) => e.urgencia === "atrasada").length;
  const indiceEtapaAtual = etapasSequenciais.findIndex((e) => e.status !== "concluida");
  const etapaAtual = indiceEtapaAtual >= 0 ? etapasSequenciais[indiceEtapaAtual] : null;
  const progresso = etapasSequenciais.length
    ? Math.round((etapasConcluidas / etapasSequenciais.length) * 100)
    : 0;

  return (
    <div className="mx-auto w-full min-w-0 space-y-6">
      <NavegacaoSecoes secoes={[
        { id: "resumo-processo", label: "Resumo" }, { id: "dados-processo", label: "Dados e responsáveis" },
        { id: "prazos-processo", label: "Prazos" }, { id: "etapas-processo", label: "Etapas e checklist" },
        { id: "comissao-processo", label: "Comissão" },
        ...(!ehFinanciamento && p.categoria === "venda" ? [{ id: "atualizacoes-corretor", label: "Atualizações ao corretor" }] : []),
        { id: "comunicacao-processo", label: "Comentários internos" },
        { id: "historico-processo", label: "Histórico" },
      ]} />
      <div id="resumo-processo" className="scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-brand via-brand/80 to-gold" />
        <div className="p-5 md:p-7">
        <VoltarLink
          href={p.categoria === "financiamento" ? "/financiamentos?aba=andamento" : "/vendas?aba=andamento"}
          label={p.categoria === "financiamento" ? "Financiamentos" : "Vendas"}
        />
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand">
                {p.categoria === "financiamento" ? "Financiamento" : "Venda"}
              </span>
              <span className="font-mono text-xs text-ink-muted">{identificacaoProcesso(p, ehFinanciamento ? "financiamento" : "venda")}</span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  p.status === "concluido"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : p.status === "cancelado"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                {p.status === "concluido"
                  ? "Concluído"
                  : p.status === "cancelado"
                    ? "Cancelado"
                    : "Em andamento"}
              </span>
            </div>
            <h1 className="mt-2 break-words text-2xl font-bold leading-tight tracking-tight text-ink md:text-[32px]">
              {p.imoveis?.endereco ?? p.comprador?.nome ?? "Processo sem identificação"}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {p.modelos_processo?.nome ?? "Processo"} · {p.comprador?.nome ?? "Sem comprador"}
            </p>
          </div>

          {!ehFinanciamento && p.categoria === "venda" && <AtalhoTermoEntrega processoId={p.id} />}

          <ModalEdicaoProcesso
            key={`editar-${p.id}-${p.comprador?.nome}-${p.vendedor?.nome}-${p.imoveis?.endereco}-${p.bancos?.nome}-${p.corretores?.nome}-${p.usuarios?.nome}-${p.codigo_san}-${p.numero_proposta_contrato}-${p.valor_total}-${p.valor_financiado}-${p.origem}-${p.indicacao?.nome}-${p.data_assinatura}-${p.data_final_contrato}`}
          >
            <form
              action={salvarDadosProcesso}
              className="space-y-3"
            >
              <input type="hidden" name="processo_id" value={p.id} />

              <div className="grid gap-3 sm:grid-cols-2">
                <CampoTexto label="Comprador" name="comprador_nome" defaultValue={p.comprador?.nome} />
                <CampoTexto label="Telefone" name="comprador_telefone" defaultValue={p.comprador?.telefone} />
              </div>

              {!ehFinanciamento && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <CampoTexto label="Vendedor" name="vendedor_nome" defaultValue={p.vendedor?.nome} />
                  <CampoTexto label="Telefone" name="vendedor_telefone" defaultValue={p.vendedor?.telefone} />
                </div>
              )}

              <CampoTexto label="Imóvel" name="imovel_endereco" defaultValue={p.imoveis?.endereco} />

              <div className="grid gap-3 sm:grid-cols-2">
                <CampoTexto label="Banco" name="banco_nome" defaultValue={p.bancos?.nome} listaId="lista-bancos" />
                <CampoTexto
                  label={p.categoria === "venda" ? "Corretor vendedor" : "Corretor"}
                  name="corretor_nome"
                  defaultValue={vendedorExibido}
                  listaId="lista-corretores"
                />
              </div>

              {p.categoria === "venda" && <CampoTexto label="Captador (opcional)" name="captador_nome" defaultValue={captadorExibido} listaId="lista-corretores" />}
              <div className="grid gap-3 sm:grid-cols-2">
                <CampoTexto
                  label="Responsável"
                  name="responsavel_nome"
                  defaultValue={p.usuarios?.nome}
                  listaId="lista-usuarios"
                />
                <CampoTexto label={ehFinanciamento ? "Proposta/contrato" : "Código SAN"} name={ehFinanciamento ? "numero_proposta_contrato" : "codigo_san"} defaultValue={ehFinanciamento ? p.numero_proposta_contrato : p.codigo_san} />
              </div>

              {ehFinanciamento && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-muted">
                        Valor financiado
                      </label>
                      <CampoMoeda name="valor_financiado" defaultValue={p.valor_financiado} />
                    </div>
                    <CampoTexto label="Origem" name="origem" defaultValue={p.origem} />
                  </div>
                  <CampoTexto
                    label="Indicação"
                    name="indicacao_nome"
                    defaultValue={p.indicacao?.nome}
                    listaId="lista-corretores"
                  />
                </>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  {ehFinanciamento ? "Valor do imóvel" : "Valor"}
                </label>
                <CampoMoeda name="valor_total" defaultValue={p.valor_total} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">
                    Data de assinatura
                  </label>
                  <input
                    type="date"
                    name="data_assinatura"
                    defaultValue={p.data_assinatura ?? ""}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">
                    Data final do contrato
                  </label>
                  <input
                    type="date"
                    name="data_final_contrato"
                    defaultValue={p.data_final_contrato ?? ""}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand"
                  />
                </div>
              </div>

              <datalist id="lista-bancos">
                {(bancosLista ?? []).map((b) => (
                  <option key={b.id} value={b.nome} />
                ))}
              </datalist>
              <datalist id="lista-corretores">
                {(corretoresLista ?? []).map((c) => (
                  <option key={c.id} value={c.nome} />
                ))}
              </datalist>
              <datalist id="lista-usuarios">
                {(usuariosLista ?? []).map((u) => (
                  <option key={u.id} value={u.nome} />
                ))}
              </datalist>

              <BotaoSubmit className="sticky bottom-0 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:opacity-90">
                Salvar alterações
              </BotaoSubmit>
            </form>
          </ModalEdicaoProcesso>
        </div>

        <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-background md:grid-cols-4">
          <ResumoProcesso
            icon={CheckCircle2}
            label="Progresso"
            value={`${progresso}%`}
            detail={`${etapasConcluidas} de ${etapasSequenciais.length} etapas`}
            tom="verde"
          />
          <ResumoProcesso
            icon={Clock3}
            label="Etapa atual"
            value={etapaAtual?.nome ?? (etapasSequenciais.length ? "Concluído" : "Sem etapas")}
            detail={etapaAtual?.data_prevista ? `Prazo ${format(parseISO(etapaAtual.data_prevista), "dd/MM/yyyy")}` : "Sem prazo definido"}
          />
          <ResumoProcesso
            icon={AlertTriangle}
            label="Atenção"
            value={etapasAtrasadas ? `${etapasAtrasadas} atrasada${etapasAtrasadas === 1 ? "" : "s"}` : "Tudo em dia"}
            detail={etapasAtrasadas ? "Requer acompanhamento" : "Nenhuma etapa vencida"}
            tom={etapasAtrasadas ? "vermelho" : "verde"}
          />
          <ResumoProcesso
            icon={CalendarDays}
            label="Prazo final"
            value={p.data_final_contrato ? format(parseISO(p.data_final_contrato), "dd/MM/yyyy") : "Não definido"}
            detail={p.data_assinatura ? `Assinado em ${format(parseISO(p.data_assinatura), "dd/MM/yyyy")}` : "Contrato sem assinatura"}
          />
        </div>

        <details id="dados-processo" className="scroll-mt-20 group mt-5 rounded-xl border border-border/70 bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-ink hover:bg-background/60">
            <span>Dados do processo</span>
            <span className="text-xs font-medium text-brand group-open:hidden">Ver detalhes</span>
            <span className="hidden text-xs font-medium text-brand group-open:inline">Ocultar detalhes</span>
          </summary>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 min-[400px]:grid-cols-2 border-t border-border/70 p-4 sm:grid-cols-3 lg:grid-cols-4">
            <Info label="Comprador" value={p.comprador?.nome} />
            {!ehFinanciamento && <Info label="Vendedor" value={p.vendedor?.nome} />}
            <Info label="Imóvel" value={p.imoveis?.endereco} />
            <Info label="Banco" value={p.bancos?.nome} />
            <Info label={p.categoria === "venda" ? "Corretor vendedor" : "Corretor"} value={vendedorExibido} />
            {p.categoria === "venda" && <Info label="Captador" value={captadorExibido} />}
            <Info label="Responsável" value={p.usuarios?.nome} />
            <Info label={ehFinanciamento ? "Proposta/contrato" : "Código SAN"} value={ehFinanciamento ? p.numero_proposta_contrato : p.codigo_san} />
            {ehFinanciamento && (
              <>
                <Info
                  label="Valor financiado"
                  value={
                    p.valor_financiado
                      ? `R$ ${Number(p.valor_financiado).toLocaleString("pt-BR")}`
                      : undefined
                  }
                />
                <Info label="Origem" value={p.origem} />
                <Info label="Indicação" value={p.indicacao?.nome} />
              </>
            )}
            <Info
              label={ehFinanciamento ? "Valor do imóvel" : "Valor"}
              value={p.valor_total ? `R$ ${Number(p.valor_total).toLocaleString("pt-BR")}` : undefined}
            />
            <Info
              label="Data de assinatura"
              value={p.data_assinatura ? format(parseISO(p.data_assinatura), "dd/MM/yyyy", { locale: ptBR }) : undefined}
            />
            <Info
              label="Prazo final do contrato"
              value={
                p.data_final_contrato
                  ? format(parseISO(p.data_final_contrato), "dd/MM/yyyy", { locale: ptBR })
                  : undefined
              }
            />
            <Info
              label="Criado em"
              value={format(parseISO(p.data_criacao), "dd/MM/yyyy", { locale: ptBR })}
            />
          </div>
        </details>
        </div>
      </div>

      {/* Situação especial ativa (se houver) */}
      {etapasEspeciaisAtivas.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            ⚠ Situação especial
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {etapasEspeciaisAtivas.map((e) => (
              <span
                key={e.id}
                className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900"
              >
                {e.nome}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <section id="prazos-processo" className="scroll-mt-20 rounded-2xl border border-border bg-surface p-5 shadow-sm md:p-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-7">
          <div>
            <h2 className="text-lg font-semibold text-ink">Linha do tempo</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              {etapaAtual ? `Etapa atual: ${etapaAtual.nome}` : "Todas as etapas foram concluídas"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-background">
                Editar linha do tempo
              </summary>
              <div className="absolute right-0 z-10 mt-1 w-72 rounded-md border border-border bg-surface p-2 shadow-md">
                <EditorLinhaTempo
                  processoId={p.id}
                  etapasIniciais={etapasSequenciais.map((e) => ({
                    id: e.id,
                    nome: e.nome,
                    status: e.status,
                  }))}
                />
              </div>
            </details>
            <BotaoExportarLinhaTempo
              titulo={p.modelos_processo?.nome ?? "Processo"}
              subtitulo={`${p.imoveis?.endereco ?? "Imóvel não informado"}: ${p.comprador?.nome ?? "Sem comprador"}`}
              etapas={etapasSequenciais.map((e) => ({ nome: e.nome, status: e.status }))}
            />
          </div>
        </div>
        <div className="overflow-x-auto pb-1">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${etapasSequenciais.length}, minmax(150px, 1fr))`,
            }}
          >
            {etapasSequenciais.map((e, i) => {
              const concluida = e.status === "concluida";
              const atual =
                !concluida &&
                (i === 0 ? true : etapasSequenciais[i - 1].status === "concluida");
              return (
                <div
                  key={`label-${e.id}`}
                  style={{ gridRow: 1, gridColumn: i + 1 }}
                  className="flex items-end justify-center px-1 pb-2 md:px-2 md:pb-3"
                >
                  <p
                    className={`break-words text-center text-[11px] font-medium leading-tight md:text-[12px] ${
                      concluida || atual ? "text-ink" : "text-ink-muted"
                    }`}
                    title={e.data_prevista ? `${e.nome}: ${e.data_prevista}` : e.nome}
                  >
                    {e.nome}
                  </p>
                </div>
              );
            })}
            {etapasSequenciais.map((e, i) => {
              const concluida = e.status === "concluida";
              const anteriorConcluida = i === 0 ? true : etapasSequenciais[i - 1].status === "concluida";
              const atual = !concluida && anteriorConcluida;

              return (
                <div
                  key={`circulo-${e.id}`}
                  style={{ gridRow: 2, gridColumn: i + 1 }}
                  className="flex items-center"
                >
                  <div
                    className={`h-0.5 flex-1 md:h-1 ${i === 0 ? "invisible" : anteriorConcluida ? "bg-brand" : "bg-border"}`}
                  />
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[2.5px] md:h-7 md:w-7 md:border-[3px] ${
                      concluida
                        ? "border-brand bg-brand"
                        : atual
                          ? "border-gold bg-surface"
                          : "border-border bg-surface"
                    }`}
                  >
                    {concluida && (
                      <svg viewBox="0 0 12 12" fill="none" className="h-2 w-2 md:h-3 md:w-3">
                        <path
                          d="M2 6.5L4.5 9L10 3"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div
                    className={`h-0.5 flex-1 md:h-1 ${i === etapasSequenciais.length - 1 ? "invisible" : concluida ? "bg-brand" : "bg-border"}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Etapas do processo */}
      <section id="etapas-processo" className="scroll-mt-20 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Etapas do processo</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Prazos, responsáveis e checklists de cada fase.</p>
          </div>
          <span className="text-xs font-medium text-ink-muted">{etapasConcluidas}/{etapasSequenciais.length} concluídas</span>
        </div>

        {etapasSequenciais.map((etapa, indice) => {
          const itensChecklist = (checklistItens ?? []).filter((c) => c.etapa_id === etapa.id);
          const nome = (etapa as unknown as { usuarios: { nome: string } | null }).usuarios?.nome;

          return (
            <details
              id={`etapa-${etapa.id}`}
              key={etapa.id}
              open={indice === indiceEtapaAtual}
              className={`group scroll-mt-24 rounded-xl border bg-surface shadow-sm transition ${
                indice === indiceEtapaAtual
                  ? "border-brand/40 ring-2 ring-brand/10"
                  : "border-border/60"
              }`}
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 p-4 sm:flex-nowrap sm:p-5">
                <div className="flex min-w-0 gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    etapa.status === "concluida"
                      ? "bg-brand text-white"
                      : indice === indiceEtapaAtual
                        ? "bg-brand-soft text-brand"
                        : "bg-background text-ink-muted"
                  }`}>
                    {etapa.status === "concluida" ? <CheckCircle2 size={16} /> : indice + 1}
                  </span>
                  <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{etapa.nome}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Responsável: {nome ?? "Não informado"}
                    {etapa.data_prevista && (
                      <>
                        {" · "}
                        Previsto: {format(parseISO(etapa.data_prevista), "dd/MM/yyyy")}
                      </>
                    )}
                    {etapa.data_realizada && (
                      <>
                        {" · "}
                        Realizado: {format(parseISO(etapa.data_realizada), "dd/MM/yyyy")}
                      </>
                    )}
                  </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                    etapa.status === "concluida"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : URGENCIA_COR[etapa.urgencia]
                  }`}
                >
                  {etapa.status === "concluida"
                    ? "Concluída"
                    : formatarPrazo(etapa.dias_para_vencer) || "Sem data"}
                </span>
              </summary>

              <div className="border-t border-border/70 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">

              {itensChecklist.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                  {itensChecklist.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      <form action={alternarChecklistItem}>
                        <input type="hidden" name="item_id" value={item.id} />
                        <input type="hidden" name="processo_id" value={p.id} />
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
                          <span className={item.concluido ? "text-ink-muted line-through" : "text-ink"}>
                            {item.descricao}
                          </span>
                        </BotaoEnviar>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              {(etapa.nome === "Registro" || etapa.nome === "Conclusão do Registro") && (
                <div className="mt-3 border-t border-border pt-3">
                  <form action={salvarNumeroRegistro} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="etapa_id" value={etapa.id} />
                    <input type="hidden" name="processo_id" value={p.id} />
                    <input
                      type="text"
                      name="numero_registro"
                      defaultValue={
                        (etapa as unknown as { numero_registro: string | null }).numero_registro ?? ""
                      }
                      placeholder="Número do registro (ex: TJDFT20260310047259GSXO)"
                      className="w-full max-w-sm rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-brand"
                    />
                    <BotaoEnviar
                      className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-ink-muted hover:bg-background"
                    >
                      Salvar
                    </BotaoEnviar>
                  </form>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {etapa.status !== "concluida" ? (
                  <form action={concluirEtapa} className="flex items-center gap-2">
                    <input type="hidden" name="etapa_id" value={etapa.id} />
                    <input type="hidden" name="processo_id" value={p.id} />
                    <BotaoEnviar
                      className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      Marcar como concluída
                    </BotaoEnviar>
                  </form>
                ) : (
                  <form action={reabrirEtapa}>
                    <input type="hidden" name="etapa_id" value={etapa.id} />
                    <input type="hidden" name="processo_id" value={p.id} />
                    <BotaoEnviar
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-background"
                    >
                      Reabrir
                    </BotaoEnviar>
                  </form>
                )}

                <form action={alterarDataPrevista} className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <input type="hidden" name="etapa_id" value={etapa.id} />
                  <input type="hidden" name="processo_id" value={p.id} />
                  <input
                    type="date"
                    name="data_prevista"
                    aria-label={`Prazo de ${etapa.nome}`}
                    defaultValue={etapa.data_prevista ?? ""}
                    className="rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-brand"
                  />
                  <BotaoEnviar
                    className="rounded-md border border-border px-2 py-1 text-xs text-ink-muted hover:bg-background"
                  >
                    Ajustar prazo
                  </BotaoEnviar>
                </form>
              </div>
              </div>
            </details>
          );
        })}
      </section>

      {/* Comissão */}
      <details id="comissao-processo" className="scroll-mt-20 group rounded-xl border border-border/70 bg-surface shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Comissão</h2>
            <p className="mt-1 text-xs text-ink-muted">
              {(comissoes ?? []).length > 0
                ? `${(comissoes ?? []).length} registro${(comissoes ?? []).length === 1 ? "" : "s"}`
                : "Nenhuma comissão cadastrada"}
            </p>
          </div>
          <span className="text-xs font-semibold text-brand group-open:hidden">Abrir</span>
          <span className="hidden text-xs font-semibold text-brand group-open:inline">Fechar</span>
        </summary>
        <div className="border-t border-border/70 p-4 sm:p-5">
          {(comissoes ?? []).length === 0 ? (
            <ComissaoForm processoId={p.id} comissao={null} corretores={corretoresLista ?? []} />
          ) : (
            <div className="space-y-3">
              {(comissoes ?? []).map((c) => (
                <ComissaoForm
                  key={c.id}
                  processoId={p.id}
                  comissao={c}
                  corretores={corretoresLista ?? []}
                />
              ))}
            </div>
          )}
        </div>
      </details>

      {!ehFinanciamento && p.categoria === "venda" && (
        <section id="atualizacoes-corretor" className="scroll-mt-20"><AtualizacoesCorretor processoId={p.id} /></section>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div id="comunicacao-processo" className="scroll-mt-20 rounded-xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5">
          <CabecalhoSecao icon={MessageSquare} titulo="Comentários internos" descricao={ehFinanciamento ? "Observações da equipe sobre o financiamento." : "Observações da equipe. Para comunicar o corretor, use Atualizações ao corretor."} />
          <form action={adicionarComentario} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="processo_id" value={p.id} />
            <input
              name="texto"
              placeholder="Escreva uma observação..."
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <BotaoEnviar
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Enviar
            </BotaoEnviar>
          </form>
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {(comentarios ?? []).length === 0 ? (
              <li className="text-sm text-ink-muted">Nenhum comentário ainda.</li>
            ) : (
              (comentarios ?? []).map((c) => {
                const nomeUsuario = (c as unknown as { usuarios: { nome: string } | null }).usuarios?.nome;
                return (
                  <li key={c.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                    <p className="text-ink">{c.texto}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {nomeUsuario ?? "Sistema"} · {format(parseISO(c.criado_em), "dd/MM HH:mm")}
                    </p>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div id="historico-processo" className="scroll-mt-20 rounded-xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5">
          <CabecalhoSecao icon={History} titulo="Histórico" descricao="Acompanhe todas as movimentações do processo." />
          <ul className="max-h-72 space-y-2 overflow-y-auto text-xs">
            {(historico ?? []).length === 0 ? (
              <li className="text-sm text-ink-muted">Sem movimentações registradas.</li>
            ) : (
              (historico ?? []).map((h) => {
                const nomeUsuario = (h as unknown as { usuarios: { nome: string } | null }).usuarios?.nome;
                return (
                  <li key={h.id} className="flex items-start gap-2 rounded-lg border border-border bg-background p-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span className="text-ink-muted">
                      <span className="text-ink">{nomeUsuario ?? "Sistema"}</span> {h.acao}
                      <br />
                      {format(parseISO(h.criado_em), "dd/MM HH:mm")}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      {/* Personalização de etapas. Fica oculta por padrão para não
          confundir com o acompanhamento normal do processo. */}
      <details className="group rounded-xl border border-border/60 bg-surface shadow-sm">
        <summary className="cursor-pointer list-none p-4 text-sm font-semibold text-ink">
          <span className="inline-flex items-center gap-1.5">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              className="transition-transform group-open:rotate-90"
            >
              <path
                d="M4 2l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Personalização de etapas
          </span>
        </summary>
        <div className="space-y-3 border-t border-border p-4">
          {etapasPadraoSequencial.length > 0 && (
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Sequência do processo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {etapasPadraoSequencial.map((ep) => {
                  const etapaExistente = etapas.find((e) => e.nome === ep.nome && !e.especial);
                  const aplicada = Boolean(etapaExistente);
                  return (
                    <form key={ep.id} action={alternarEtapaPadrao}>
                      <input type="hidden" name="processo_id" value={p.id} />
                      <input type="hidden" name="nome" value={ep.nome} />
                      <input type="hidden" name="ordem" value={ep.ordem} />
                      <input type="hidden" name="aplicada" value={String(aplicada)} />
                      {etapaExistente && (
                        <input type="hidden" name="etapa_id" value={etapaExistente.id} />
                      )}
                      <BotaoEnviar
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                          aplicada
                            ? "border-brand bg-brand/10 font-medium text-brand"
                            : "border-border bg-surface text-ink-muted hover:bg-background"
                        }`}
                      >
                        <span
                          className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                            aplicada ? "border-brand bg-brand text-white" : "border-border-strong"
                          }`}
                        >
                          {aplicada && (
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2 6.5L4.5 9L10 3"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        {ep.nome}
                      </BotaoEnviar>
                    </form>
                  );
                })}
              </div>
            </div>
          )}

          {etapasPadraoEspecial.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-800">
                Situação especial (fora da sequência normal)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {etapasPadraoEspecial.map((ep) => {
                  const etapaExistente = etapas.find((e) => e.nome === ep.nome && e.especial);
                  const aplicada = Boolean(etapaExistente);
                  return (
                    <form key={ep.id} action={alternarEtapaPadrao}>
                      <input type="hidden" name="processo_id" value={p.id} />
                      <input type="hidden" name="nome" value={ep.nome} />
                      <input type="hidden" name="ordem" value={ep.ordem} />
                      <input type="hidden" name="aplicada" value={String(aplicada)} />
                      {etapaExistente && (
                        <input type="hidden" name="etapa_id" value={etapaExistente.id} />
                      )}
                      <BotaoEnviar
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                          aplicada
                            ? "border-amber-400 bg-amber-100 font-medium text-amber-900"
                            : "border-amber-200 bg-surface text-ink-muted hover:bg-amber-50"
                        }`}
                      >
                        <span
                          className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                            aplicada ? "border-amber-500 bg-amber-500 text-white" : "border-border-strong"
                          }`}
                        >
                          {aplicada && (
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2 6.5L4.5 9L10 3"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        {ep.nome}
                      </BotaoEnviar>
                    </form>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </details>

      <form action={apagarProcesso}>
        <input type="hidden" name="id" value={p.id} />
        <BotaoComConfirmacao
          mensagem="Apagar este processo? Essa ação não pode ser desfeita."
          className="text-xs font-medium text-ink-muted hover:text-rose-600"
        >
          Apagar processo
        </BotaoComConfirmacao>
      </form>
    </div>
  );
}

function ResumoProcesso({
  icon: Icone,
  label,
  value,
  detail,
  tom = "neutro",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tom?: "neutro" | "verde" | "vermelho";
}) {
  const cores =
    tom === "vermelho"
      ? "bg-rose-50 text-rose-700"
      : tom === "verde"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-surface text-brand";

  return (
    <div className="border-b border-r border-border p-4 last:border-r-0 md:border-b-0">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cores}`}>
          <Icone size={16} strokeWidth={2} />
        </span>
        <p className="text-xs font-medium text-ink-muted">{label}</p>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-ink" title={value}>{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-ink-muted" title={detail}>{detail}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-ink">{value || "Não informado"}</p>
    </div>
  );
}

function CampoTexto({
  label,
  name,
  defaultValue,
  listaId,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  listaId?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-muted">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        list={listaId}
        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand"
      />
    </div>
  );
}

function ComissaoForm({
  processoId,
  comissao,
  corretores,
}: {
  processoId: string;
  comissao:
    | {
        id: string;
        beneficiario_id: string | null;
        valor_previsto: number | null;
        status: string;
        data_prevista: string | null;
        observacoes: string | null;
      }
    | null;
  corretores: { id: string; nome: string }[];
}) {
  const opcoesCorretores = corretoresComissao(corretores, comissao?.beneficiario_id);
  const beneficiarioAnterior = corretores.find(c => c.id === comissao?.beneficiario_id);
  return (
    <form
      action={salvarComissao}
      className="grid gap-3 rounded-xl border border-border/60 bg-surface shadow-sm p-5 sm:grid-cols-2"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      {comissao && <input type="hidden" name="comissao_id" value={comissao.id} />}

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">Corretor</label>
        <select
          name="beneficiario_id"
          defaultValue={comissao?.beneficiario_id ?? ""}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">Selecione</option>
          {beneficiarioAnterior && !opcoesCorretores.some(c => c.id === beneficiarioAnterior.id) && (
            <option hidden value={beneficiarioAnterior.id}>{beneficiarioAnterior.nome} (cadastro anterior)</option>
          )}
          {opcoesCorretores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">Valor previsto (R$)</label>
        <CampoMoeda name="valor_previsto" defaultValue={comissao?.valor_previsto ?? undefined} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">Status</label>
        <select
          name="status"
          defaultValue={comissao?.status ?? "0% pago"}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="0% pago">0% pago</option>
          <option value="50% pago">50% pago</option>
          <option value="100% pago">100% pago</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">
          Prevista pra quando
        </label>
        <input
          name="data_prevista"
          type="date"
          defaultValue={comissao?.data_prevista ?? ""}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-ink-muted">
          Observações <span className="text-ink-muted/70">(ex: combinado de pagar na entrega)</span>
        </label>
        <textarea
          name="observacoes"
          defaultValue={comissao?.observacoes ?? ""}
          rows={2}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="sm:col-span-2">
        <BotaoEnviar
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {comissao ? "Salvar comissão" : "Adicionar comissão"}
        </BotaoEnviar>
      </div>
    </form>
  );
}
