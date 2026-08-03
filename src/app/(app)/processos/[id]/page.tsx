import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { anexarUrgencia, URGENCIA_COR, formatarPrazo } from "@/lib/alertas";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { VoltarLink } from "@/components/voltar-link";
import { CampoMoeda } from "@/components/campo-moeda";
import {
  concluirEtapa,
  reabrirEtapa,
  alterarDataPrevista,
  alternarChecklistItem,
  alternarEtapaPadrao,
  salvarComissao,
  adicionarComentario,
} from "./actions";

export default async function ProcessoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: processo } = await supabase
    .from("processos")
    .select(
      `id, numero_processo, status, valor_total, valor_financiado, origem, categoria, data_criacao,
       comprador:clientes!processos_comprador_id_fkey ( nome, telefone ),
       vendedor:clientes!processos_vendedor_id_fkey ( nome, telefone ),
       imoveis ( endereco ), bancos ( nome ),
       corretores!processos_corretor_id_fkey ( nome ), usuarios ( nome ), modelos_processo ( nome ),
       indicacao:corretores!processos_indicacao_id_fkey ( nome )`
    )
    .eq("id", id)
    .single();

  if (!processo) notFound();

  const { data: comissoes } = await supabase
    .from("comissoes")
    .select("*, corretores!comissoes_beneficiario_id_fkey ( nome )")
    .eq("processo_id", id)
    .order("criado_em", { ascending: true });

  const { data: etapasPadrao } = await supabase
    .from("etapas_padrao")
    .select("id, nome, ordem, categoria, tipo")
    .eq("categoria", (processo as unknown as { categoria: string }).categoria)
    .order("ordem", { ascending: true });

  const { data: corretoresLista } = await supabase
    .from("corretores")
    .select("id, nome")
    .order("nome");

  const { data: etapasRaw } = await supabase
    .from("etapas")
    .select("*, usuarios ( nome )")
    .eq("processo_id", id)
    .order("ordem", { ascending: true });

  const etapas = anexarUrgencia(etapasRaw ?? []);

  const etapaIds = (etapasRaw ?? []).map((e) => e.id);
  const { data: checklistItens } = etapaIds.length
    ? await supabase.from("checklist_itens").select("*").in("etapa_id", etapaIds).order("ordem")
    : { data: [] };

  const { data: comentarios } = await supabase
    .from("comentarios")
    .select("*, usuarios ( nome )")
    .eq("processo_id", id)
    .order("criado_em", { ascending: false });

  const { data: historico } = await supabase
    .from("historico")
    .select("*, usuarios ( nome )")
    .eq("processo_id", id)
    .order("criado_em", { ascending: false })
    .limit(20);

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
  };
  const p = processo as unknown as P;
  const ehFinanciamento = p.categoria === "financiamento";

  const etapasPadraoSequencial = (etapasPadrao ?? []).filter((ep) => ep.tipo === "sequencial");
  const etapasPadraoEspecial = (etapasPadrao ?? []).filter((ep) => ep.tipo === "especial");
  const nomesEspeciais = new Set(etapasPadraoEspecial.map((ep) => ep.nome));

  const etapasSequenciais = etapas.filter((e) => !nomesEspeciais.has(e.nome));
  const etapasEspeciaisAtivas = etapas.filter((e) => nomesEspeciais.has(e.nome));

  return (
    <div className="max-w-3xl space-y-8 lg:max-w-5xl">
      <div>
        <VoltarLink
          href={`/processos?categoria=${p.categoria}`}
          label={p.categoria === "financiamento" ? "Financiamentos" : "Vendas"}
        />
        <p className="font-mono text-xs text-ink-muted">{p.numero_processo}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          {p.modelos_processo?.nome} — {p.comprador?.nome ?? "Sem comprador"}
        </h1>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-ink-muted sm:grid-cols-3">
          {!ehFinanciamento && <Info label="Vendedor" value={p.vendedor?.nome} />}
          <Info label="Imóvel" value={p.imoveis?.endereco} />
          <Info label="Banco" value={p.bancos?.nome} />
          <Info label="Corretor" value={p.corretores?.nome} />
          <Info label="Responsável" value={p.usuarios?.nome} />
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
            label="Criado em"
            value={format(parseISO(p.data_criacao), "dd/MM/yyyy", { locale: ptBR })}
          />
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
      <section className="rounded-2xl border border-border bg-surface p-5 md:p-8">
        <h2 className="mb-5 text-base font-semibold text-ink md:mb-8">Linha do tempo</h2>
        <div className="overflow-x-auto pb-1 md:overflow-visible">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${etapasSequenciais.length}, minmax(88px, 1fr))`,
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
                    title={e.data_prevista ? `${e.nome} — ${e.data_prevista}` : e.nome}
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
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Etapas do processo</h2>

        {etapas.map((etapa) => {
          const itensChecklist = (checklistItens ?? []).filter((c) => c.etapa_id === etapa.id);
          const nome = (etapa as unknown as { usuarios: { nome: string } | null }).usuarios?.nome;

          return (
            <div key={etapa.id} className="rounded-xl border border-border/60 bg-surface shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{etapa.nome}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Responsável: {nome ?? "—"}
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
              </div>

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
                        <button type="submit" className="flex items-center gap-2 text-left">
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
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {etapa.status !== "concluida" ? (
                  <form action={concluirEtapa} className="flex items-center gap-2">
                    <input type="hidden" name="etapa_id" value={etapa.id} />
                    <input type="hidden" name="processo_id" value={p.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      Marcar como concluída
                    </button>
                  </form>
                ) : (
                  <form action={reabrirEtapa}>
                    <input type="hidden" name="etapa_id" value={etapa.id} />
                    <input type="hidden" name="processo_id" value={p.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-background"
                    >
                      Reabrir
                    </button>
                  </form>
                )}

                <form action={alterarDataPrevista} className="flex items-center gap-1.5">
                  <input type="hidden" name="etapa_id" value={etapa.id} />
                  <input type="hidden" name="processo_id" value={p.id} />
                  <input
                    type="date"
                    name="data_prevista"
                    defaultValue={etapa.data_prevista ?? ""}
                    className="rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-border px-2 py-1 text-xs text-ink-muted hover:bg-background"
                  >
                    Ajustar prazo
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </section>

      {/* Comissão */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Comissão</h2>
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
      </section>

      {/* Comentários */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Comentários</h2>
        <form action={adicionarComentario} className="mb-4 flex gap-2">
          <input type="hidden" name="processo_id" value={p.id} />
          <input
            name="texto"
            placeholder="Escreva uma observação..."
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Enviar
          </button>
        </form>
        <ul className="space-y-2">
          {(comentarios ?? []).map((c) => {
            const nomeUsuario = (c as unknown as { usuarios: { nome: string } | null }).usuarios?.nome;
            return (
              <li key={c.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
                <p className="text-ink">{c.texto}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {nomeUsuario ?? "—"} · {format(parseISO(c.criado_em), "dd/MM HH:mm")}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Histórico */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Histórico</h2>
        <ul className="space-y-1.5 text-xs text-ink-muted">
          {(historico ?? []).map((h) => {
            const nomeUsuario = (h as unknown as { usuarios: { nome: string } | null }).usuarios?.nome;
            return (
              <li key={h.id}>
                {format(parseISO(h.criado_em), "dd/MM HH:mm")} — {nomeUsuario ?? "Sistema"}{" "}
                {h.acao}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Personalização de etapas — fica oculta por padrão pra não
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
                  const etapaExistente = etapas.find((e) => e.nome === ep.nome);
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
                      <button
                        type="submit"
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
                      </button>
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
                  const etapaExistente = etapas.find((e) => e.nome === ep.nome);
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
                      <button
                        type="submit"
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
                      </button>
                    </form>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p>
      <span className="text-ink-muted">{label}: </span>
      <span className="text-ink">{value}</span>
    </p>
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
          <option value="">—</option>
          {corretores.map((c) => (
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
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {comissao ? "Salvar comissão" : "Adicionar comissão"}
        </button>
      </div>
    </form>
  );
}
