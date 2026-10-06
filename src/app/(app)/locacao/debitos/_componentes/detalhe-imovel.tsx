import Link from "next/link";
import { ExternalLink, Globe, Mail, Paperclip } from "lucide-react";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import type { PermissoesDebitos } from "@/lib/debitos/permissoes";
import { ROTULO_METODO, ROTULO_STATUS, ROTULO_TIPO, rotuloCompetencia, rotuloCompetenciaCurto, type StatusVerificacao, type TipoVerificacao } from "@/lib/debitos/regras";
import { inscricaoParaCopiar } from "@/lib/debitos/tributos";
import { formatarDataHoraBR } from "@/lib/data-br";
import type { Tables } from "@/lib/database.types";
import { removerDebito, salvarVinculoCondominio } from "../actions";
import type { Administradora, DadosPainel, DetalheContrato, Solicitacao } from "../dados";
import { FormConferencia } from "./form-conferencia";
import { ROTULO, SeloStatus, dataBR, moeda } from "./ui";

type Linha = DadosPainel["linhas"][number];

function Bloco({ titulo, selo, children }: { titulo: string; selo?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink">{titulo}</h3>
        {selo}
      </div>
      {children}
    </section>
  );
}

function Conferido({ v }: { v: Tables<"debitos_verificacoes"> | null }) {
  if (!v?.verificado_em) return null;
  return (
    <p className="text-xs text-ink-muted">
      Conferido por {v.verificado_por_nome ?? "—"} em {formatarDataHoraBR(v.verificado_em)}.
    </p>
  );
}

function ListaDebitos({ itens, tipo, podeOperar }: { itens: Tables<"debitos_itens">[]; tipo: TipoVerificacao; podeOperar: boolean }) {
  if (itens.length === 0) return null;
  return (
    <ul className="space-y-2">
      {itens.map((item) => (
        <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="num font-semibold text-rose-800">
              {moeda(item.valor === null ? null : Number(item.valor))}
              {item.vencimento ? <span className="font-normal text-ink-muted"> · vence em {dataBR(item.vencimento)}</span> : null}
            </p>
            <p className="text-xs text-ink-muted">
              {[
                item.referencia ? `${tipo === "iptu_tlp" ? "Exercício" : "Competência"} ${item.referencia}` : null,
                item.parcela ? `Parcela ${item.parcela}` : null,
                item.descricao,
                item.situacao,
                item.observacao,
              ]
                .filter(Boolean)
                .join(" · ") || "Sem detalhes"}
            </p>
            <p className="text-[11px] text-ink-muted">
              Lançado por {item.criado_por_nome ?? "—"} em {formatarDataHoraBR(item.criado_em)}
              {item.anexo_caminho && (
                <>
                  {" · "}
                  <a href={`/locacao/debitos/anexo/${item.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand underline">
                    <Paperclip size={11} /> {item.anexo_nome ?? "anexo"}
                  </a>
                </>
              )}
            </p>
          </div>
          {podeOperar && (
            <form action={removerDebito}>
              <input type="hidden" name="item_id" value={item.id} />
              <button type="submit" className="text-xs text-rose-700 hover:underline">
                Remover
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DetalheImovel({
  linha,
  competencia,
  tenantId,
  administradoras,
  solicitacoes,
  detalhe,
  urlIptu,
  perms,
}: {
  linha: Linha;
  competencia: string;
  tenantId: string;
  administradoras: Administradora[];
  solicitacoes: Solicitacao[];
  detalhe: DetalheContrato;
  urlIptu: string;
  perms: PermissoesDebitos;
}) {
  const c = linha.contrato;
  const adm = administradoras.find((a) => a.id === linha.administradoraId) ?? null;
  const vCond = linha.verificacaoCondominio;
  const vIptu = linha.verificacaoIptu;
  const itensCond = detalhe.itens.filter((i) => i.verificacao_id === vCond?.id);
  const itensIptu = detalhe.itens.filter((i) => i.verificacao_id === vIptu?.id);
  const solicitacao = vCond?.solicitacao_id ? solicitacoes.find((s) => s.id === vCond.solicitacao_id) : null;
  const inscricao = inscricaoParaCopiar(linha.inscricao);
  const semCondominio = c.possui_condominio === false;

  // histórico agrupado por competência
  const porCompetencia = new Map<string, DetalheContrato["historico"]>();
  for (const h of detalhe.historico) porCompetencia.set(h.competencia, [...(porCompetencia.get(h.competencia) ?? []), h]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-muted">
        <p>
          {linha.inquilino ? `Inquilino: ${linha.inquilino}` : "Sem inquilino cadastrado"}
          {c.locador?.nome ? ` · Proprietário: ${c.locador.nome}` : ""}
        </p>
        <Link href={`/locacao/${c.id}`} className="text-xs font-medium text-brand hover:underline">
          Abrir contrato →
        </Link>
      </div>

      {/* ---------------- CONDOMÍNIO ---------------- */}
      <Bloco titulo="Condomínio" selo={<SeloStatus status={vCond?.status as StatusVerificacao | undefined} completo />}>
        <div className="space-y-3">
          {semCondominio ? (
            <p className="text-sm text-ink-muted">Este imóvel está marcado como sem condomínio.</p>
          ) : adm ? (
            <div className="rounded-lg bg-background px-3 py-3 text-sm">
              <p className="font-semibold text-ink">Administradora: {adm.nome}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {ROTULO_METODO[adm.metodo_consulta as keyof typeof ROTULO_METODO]}
                {adm.telefone ? ` · ${adm.telefone}` : ""}
                {adm.email_solicitacao ? ` · ${adm.email_solicitacao}` : ""}
              </p>

              {adm.metodo_consulta === "portal" && (
                <div className="mt-3 space-y-2">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" /> Consulta online disponível
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {adm.portal_url ? (
                      <a href={adm.portal_url} target="_blank" rel="noopener noreferrer" className={SECONDARY_BUTTON_CLASS}>
                        <Globe size={15} /> Abrir portal <ExternalLink size={13} />
                      </a>
                    ) : (
                      <span className="text-xs text-amber-800">Cadastre o endereço do portal na administradora.</span>
                    )}
                    {adm.portal_login_proprio && <span className="text-xs text-ink-muted">A Sacra tem login próprio neste portal.</span>}
                  </div>
                  {(adm.portal_identificacao || adm.portal_orientacoes) && (
                    <p className="whitespace-pre-line text-xs text-ink-muted">
                      {adm.portal_identificacao ? `Para localizar a unidade: ${adm.portal_identificacao}\n` : ""}
                      {adm.portal_orientacoes ?? ""}
                    </p>
                  )}
                </div>
              )}

              {adm.metodo_consulta === "email" && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-muted">
                  <Mail size={13} />
                  {solicitacao
                    ? `Solicitação enviada em ${formatarDataHoraBR(solicitacao.enviado_em)} para ${solicitacao.destinatario}.`
                    : "Consulta por e-mail: envie a solicitação pela aba Solicitações (um único e-mail com todas as unidades desta administradora)."}
                </p>
              )}

              {(c.condominio_nome || c.condominio_unidade || c.condominio_bloco || c.condominio_codigo_unidade) && (
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                  {[
                    ["Condomínio", c.condominio_nome],
                    ["Unidade", c.condominio_unidade],
                    ["Bloco", c.condominio_bloco],
                    ["Código", c.condominio_codigo_unidade],
                  ]
                    .filter(([, v]) => v)
                    .map(([rot, v]) => (
                      <div key={rot}>
                        <dt className="text-ink-muted">{rot}</dt>
                        <dd className="font-semibold text-ink">{v}</dd>
                      </div>
                    ))}
                </dl>
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Nenhuma administradora vinculada a este imóvel. Preencha o vínculo logo abaixo para o Vitral saber se a conferência é por portal ou por e-mail.
            </p>
          )}

          <ListaDebitos itens={itensCond} tipo="condominio" podeOperar={perms.operar} />
          <Conferido v={vCond} />
          {perms.operar && (
            <FormConferencia
              key={`cond-${vCond?.status}-${itensCond.length}`}
              contratoId={c.id}
              tenantId={tenantId}
              tipo="condominio"
              competencia={competencia}
              statusAtual={(vCond?.status as StatusVerificacao | undefined) ?? null}
              observacao={vCond?.observacao ?? null}
              debitosLancados={itensCond.length}
            />
          )}

          {perms.operar && (
            <details className="rounded-lg border border-border/60 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-ink">Vínculo com o condomínio e a administradora</summary>
              <form action={salvarVinculoCondominio} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <input type="hidden" name="contrato_id" value={c.id} />
                <label className="block">
                  <span className={ROTULO}>Possui condomínio?</span>
                  <select name="possui_condominio" defaultValue={c.possui_condominio === null ? "" : c.possui_condominio ? "sim" : "nao"} className={INPUT_CLASS}>
                    <option value="">Não informado</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </label>
                <label className="block sm:col-span-1 lg:col-span-2">
                  <span className={ROTULO}>Administradora</span>
                  <select name="administradora_id" defaultValue={c.administradora_id ?? ""} className={INPUT_CLASS}>
                    <option value="">— Nenhuma —</option>
                    {administradoras
                      .filter((a) => a.ativa || a.id === c.administradora_id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block">
                  <span className={ROTULO}>Nome do condomínio</span>
                  <input name="condominio_nome" defaultValue={c.condominio_nome ?? ""} className={INPUT_CLASS} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Unidade</span>
                  <input name="condominio_unidade" defaultValue={c.condominio_unidade ?? ""} className={INPUT_CLASS} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Bloco</span>
                  <input name="condominio_bloco" defaultValue={c.condominio_bloco ?? ""} className={INPUT_CLASS} />
                </label>
                <label className="block">
                  <span className={ROTULO}>E-mail específico (se houver)</span>
                  <input name="condominio_email" type="email" defaultValue={c.condominio_email ?? ""} className={INPUT_CLASS} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Código da unidade na administradora</span>
                  <input name="condominio_codigo_unidade" defaultValue={c.condominio_codigo_unidade ?? ""} className={INPUT_CLASS} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Inscrição do imóvel no DF</span>
                  <input name="inscricao_iptu" defaultValue={linha.inscricao ?? ""} className={INPUT_CLASS} />
                </label>
                <label className="block sm:col-span-2 lg:col-span-3">
                  <span className={ROTULO}>Observações</span>
                  <input name="condominio_observacoes" defaultValue={c.condominio_observacoes ?? ""} className={INPUT_CLASS} />
                </label>
                <div>
                  <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Salvando…">
                    Salvar vínculo
                  </BotaoEnviar>
                </div>
              </form>
            </details>
          )}
        </div>
      </Bloco>

      {/* ---------------- IPTU/TLP ---------------- */}
      <Bloco titulo="IPTU/TLP" selo={<SeloStatus status={vIptu?.status as StatusVerificacao | undefined} completo />}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-background px-3 py-3 text-sm">
            <div className="mr-auto">
              <p className="text-xs text-ink-muted">Inscrição do imóvel no DF</p>
              <p className="num text-base font-semibold text-ink">{linha.inscricao ?? "Não cadastrada"}</p>
            </div>
            {inscricao && <BotaoCopiarLink texto={inscricao} rotulo="Copiar inscrição" />}
            <a href={urlIptu} target="_blank" rel="noopener noreferrer" className={SECONDARY_BUTTON_CLASS}>
              Consultar IPTU/TLP <ExternalLink size={13} />
            </a>
          </div>
          <p className="text-xs text-ink-muted">A consulta é feita por você no serviço oficial da Receita do DF; o Vitral não acessa o site. Depois, registre o resultado aqui.</p>
          <ListaDebitos itens={itensIptu} tipo="iptu_tlp" podeOperar={perms.operar} />
          <Conferido v={vIptu} />
          {perms.operar && (
            <FormConferencia
              key={`iptu-${vIptu?.status}-${itensIptu.length}`}
              contratoId={c.id}
              tenantId={tenantId}
              tipo="iptu_tlp"
              competencia={competencia}
              statusAtual={(vIptu?.status as StatusVerificacao | undefined) ?? null}
              observacao={vIptu?.observacao ?? null}
              debitosLancados={itensIptu.length}
            />
          )}
        </div>
      </Bloco>

      {/* ---------------- HISTÓRICO ---------------- */}
      <Bloco titulo="Histórico de conferências">
        {porCompetencia.size === 0 ? (
          <p className="text-sm text-ink-muted">Ainda não há conferências registradas para este imóvel.</p>
        ) : (
          <ul className="divide-y divide-border">
            {[...porCompetencia.entries()].map(([comp, lista]) => (
              <li key={comp} className={`grid gap-2 py-2.5 sm:grid-cols-[90px_1fr] ${comp === competencia ? "font-medium" : ""}`}>
                <span className="num text-xs font-semibold text-ink">{rotuloCompetenciaCurto(comp)}</span>
                <div className="space-y-1">
                  {lista
                    .sort((a, b) => a.tipo.localeCompare(b.tipo))
                    .map((h) => {
                      const total = h.itens.reduce((s, i) => s + Number(i.valor ?? 0), 0);
                      return (
                        <p key={h.id} className="text-xs text-ink-muted">
                          <span className="text-ink">{ROTULO_TIPO[h.tipo as TipoVerificacao]}:</span> {ROTULO_STATUS[h.status as StatusVerificacao]}
                          {h.status === "com_debitos" && total > 0 ? ` · ${moeda(total)}` : ""}
                          {h.verificado_em ? ` · verificado em ${dataBR(h.verificado_em)} por ${h.verificado_por_nome ?? "—"}` : ""}
                        </p>
                      );
                    })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      {detalhe.eventos.length > 0 && (
        <details className="rounded-xl border border-border/70 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink-muted hover:text-ink">Registro de atividades ({detalhe.eventos.length})</summary>
          <ol className="mt-3 space-y-2">
            {detalhe.eventos.map((e) => (
              <li key={e.id} className="border-l-2 border-border pl-3 text-xs">
                <p className="text-ink">{e.descricao}</p>
                <p className="text-ink-muted">
                  {e.usuario_nome ?? "—"} · {formatarDataHoraBR(e.criado_em)}
                </p>
              </li>
            ))}
          </ol>
        </details>
      )}
      <p className="text-[11px] text-ink-muted">Competência em conferência: {rotuloCompetencia(competencia)}.</p>
    </div>
  );
}
