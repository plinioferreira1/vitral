import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Mail,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { SelecionarTodos } from "@/components/selecionar-todos";
import {
  CARD_CLASS,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/components/ui/styles";
import type { PermissoesDebitos } from "@/lib/debitos/permissoes";
import {
  acaoNecessaria,
  rotuloCompetencia,
  type FiltrosPainel,
  type StatusVerificacao,
} from "@/lib/debitos/regras";
import { acaoEmLote } from "../actions";
import type { DadosPainel } from "../dados";
import { ROTULO, SeloStatus, hrefPainel } from "./ui";

type Linha = DadosPainel["linhas"][number];

const TOM_ACAO = {
  ok: "text-emerald-700",
  pendente: "text-amber-800",
  debito: "font-semibold text-rose-700",
} as const;

function estadosDaLinha(linha: Linha): StatusVerificacao[] {
  return [linha.condominio?.status, linha.iptu?.status].filter(
    Boolean,
  ) as StatusVerificacao[];
}

function prioridade(linha: Linha): number {
  const estados = estadosDaLinha(linha);
  if (estados.includes("com_debitos")) return 0;
  if (estados.includes("pendente")) return 1;
  if (estados.includes("aguardando_administradora")) return 2;
  return 3;
}

function Indicador({
  rotulo,
  valor,
  detalhe,
  href,
  tom,
}: {
  rotulo: string;
  valor: number;
  detalhe: string;
  href: string;
  tom: "alerta" | "espera" | "debito";
}) {
  const estilo = {
    alerta: "bg-amber-50/70 text-amber-900 ring-amber-200",
    espera: "bg-sky-50/70 text-sky-900 ring-sky-200",
    debito: "bg-rose-50/70 text-rose-900 ring-rose-200",
  }[tom];
  return (
    <Link
      href={href}
      scroll={false}
      className={`rounded-xl p-4 ring-1 ring-inset transition hover:-translate-y-0.5 hover:shadow-sm ${estilo}`}
    >
      <p className="text-xs font-semibold">{rotulo}</p>
      <p className="num mt-1 text-3xl font-bold">{valor}</p>
      <p className="mt-1 text-xs opacity-75">{detalhe}</p>
    </Link>
  );
}

function AcoesRapidas({
  linha,
  competencia,
  hrefDetalhe,
}: {
  linha: Linha;
  competencia: string;
  hrefDetalhe: string;
}) {
  const estados = estadosDaLinha(linha);
  const temPendente = estados.some(
    (status) => status === "pendente" || status === "aguardando_administradora",
  );
  const temDebito = estados.includes("com_debitos");
  const podePedirPosicao =
    linha.condominio?.status === "pendente" &&
    linha.metodo === "email" &&
    !!linha.administradoraId &&
    !linha.verificacaoCondominio?.solicitacao_id;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {temPendente && !temDebito && (
        <form action={acaoEmLote}>
          <input type="hidden" name="competencia" value={competencia} />
          <input type="hidden" name="contratos" value={linha.contratoId} />
          <input type="hidden" name="acao" value="ambos_sem_debito" />
          <BotaoEnviar
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            textoEnviando="Salvando…"
          >
            <Check size={14} aria-hidden="true" />
            Tudo certo
          </BotaoEnviar>
        </form>
      )}
      {podePedirPosicao && (
        <form action={acaoEmLote}>
          <input type="hidden" name="competencia" value={competencia} />
          <input type="hidden" name="contratos" value={linha.contratoId} />
          <input type="hidden" name="acao" value="enviar_solicitacao" />
          <BotaoEnviar
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-background"
            textoEnviando="Enviando…"
          >
            <Mail size={14} aria-hidden="true" />
            Pedir posição
          </BotaoEnviar>
        </form>
      )}
      <Link
        href={hrefDetalhe}
        scroll={false}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-brand hover:bg-brand-soft"
      >
        {temDebito ? "Ver débito" : "Registrar débito"}
        <AlertTriangle size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

export function Painel({
  dados,
  linhas,
  competencia,
  params,
  filtros,
  perms,
}: {
  dados: DadosPainel;
  linhas: Linha[];
  competencia: string;
  params: Record<string, string | undefined>;
  filtros: FiltrosPainel;
  perms: PermissoesDebitos;
}) {
  const todasVerificacoes = dados.linhas.flatMap(estadosDaLinha);
  const total = todasVerificacoes.filter(
    (status) => status !== "nao_se_aplica",
  ).length;
  const pendentes = todasVerificacoes.filter(
    (status) => status === "pendente",
  ).length;
  const aguardando = todasVerificacoes.filter(
    (status) => status === "aguardando_administradora",
  ).length;
  const debitos = todasVerificacoes.filter(
    (status) => status === "com_debitos",
  ).length;
  const concluidas = todasVerificacoes.filter(
    (status) => status === "sem_debitos" || status === "com_debitos",
  ).length;
  const progresso = total ? Math.round((concluidas / total) * 100) : 100;
  const semAdministradora = dados.linhas.filter(
    (linha) =>
      linha.contrato.possui_condominio !== false && !linha.administradoraId,
  ).length;
  const temFiltroAvancado = !!(
    filtros.tipo ||
    filtros.administradoraId ||
    filtros.metodo
  );
  const base = { mes: params.mes };
  const linhasOrdenadas = linhas.toSorted((a, b) => {
    const porPrioridade = prioridade(a) - prioridade(b);
    return porPrioridade || a.imovel.localeCompare(b.imovel, "pt-BR");
  });
  const hrefDetalhe = (linha: Linha) =>
    hrefPainel(params, { detalhe: linha.contratoId });
  const situacoes = [
    [null, "Todos"],
    ["pendente", "A conferir"],
    ["aguardando", "Aguardando"],
    ["com_debito", "Com débito"],
    ["verificado", "Concluídos"],
  ] as const;

  return (
    <div className="space-y-5">
      <section className={`${CARD_CLASS} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-semibold text-ink">
              Progresso de {rotuloCompetencia(competencia)}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {concluidas} de {total} conferências concluídas
            </p>
          </div>
          <p className="num text-2xl font-bold text-brand">{progresso}%</p>
        </div>
        <div
          className="h-2 bg-background"
          role="progressbar"
          aria-label="Progresso das conferências do mês"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progresso}
        >
          <div
            className="h-full bg-brand transition-[width]"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador
          rotulo="Precisa conferir"
          valor={pendentes}
          detalhe="Condomínio ou IPTU/TLP"
          href={hrefPainel(base, { situacao: "pendente" })}
          tom="alerta"
        />
        <Indicador
          rotulo="Aguardando resposta"
          valor={aguardando}
          detalhe="Solicitações às administradoras"
          href={hrefPainel(base, { situacao: "aguardando" })}
          tom="espera"
        />
        <Indicador
          rotulo="Com débito"
          valor={debitos}
          detalhe="Exige acompanhamento"
          href={hrefPainel(base, { situacao: "com_debito" })}
          tom="debito"
        />
      </div>

      {semAdministradora > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>
            <b>{semAdministradora}</b>{" "}
            {semAdministradora === 1 ? "imóvel precisa" : "imóveis precisam"} de
            administradora vinculada.
          </p>
          <Link
            href={hrefPainel(base, { adm: "sem", situacao: null })}
            className="text-xs font-semibold underline underline-offset-2"
          >
            Resolver cadastros
          </Link>
        </div>
      )}

      <section className={`${CARD_CLASS} p-4`}>
        <div className="flex flex-wrap gap-2" aria-label="Filtrar por situação">
          {situacoes.map(([valor, rotulo]) => {
            const ativo = (filtros.situacao ?? null) === valor;
            return (
              <Link
                key={valor ?? "todos"}
                href={hrefPainel(params, {
                  situacao: valor,
                  detalhe: null,
                })}
                scroll={false}
                aria-current={ativo ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${ativo ? "bg-brand text-white" : "bg-background text-ink-muted hover:text-ink"}`}
              >
                {rotulo}
              </Link>
            );
          })}
        </div>

        <form method="get" className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          {params.mes && <input type="hidden" name="mes" value={params.mes} />}
          {filtros.situacao && (
            <input type="hidden" name="situacao" value={filtros.situacao} />
          )}
          <label className="block">
            <span className="sr-only">Buscar imóvel</span>
            <span className="relative block">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                name="q"
                defaultValue={filtros.q ?? ""}
                placeholder="Buscar imóvel, inquilino ou administradora"
                className={`${INPUT_CLASS} pl-9`}
              />
            </span>
          </label>
          <button type="submit" className={SECONDARY_BUTTON_CLASS}>
            Buscar
          </button>

          <details open={temFiltroAvancado} className="group lg:col-span-2">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink">
              <SlidersHorizontal size={14} aria-hidden="true" />
              Mais filtros
              <ChevronDown
                size={14}
                className="transition group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-3">
              <label>
                <span className={ROTULO}>Tipo</span>
                <select
                  name="tipo"
                  defaultValue={filtros.tipo ?? ""}
                  className={INPUT_CLASS}
                >
                  <option value="">Condomínio e IPTU/TLP</option>
                  <option value="condominio">Condomínio</option>
                  <option value="iptu_tlp">IPTU/TLP</option>
                </select>
              </label>
              <label>
                <span className={ROTULO}>Administradora</span>
                <select
                  name="adm"
                  defaultValue={filtros.administradoraId ?? ""}
                  className={INPUT_CLASS}
                >
                  <option value="">Todas</option>
                  <option value="sem">Sem administradora</option>
                  {dados.administradoras.map((administradora) => (
                    <option key={administradora.id} value={administradora.id}>
                      {administradora.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={ROTULO}>Método</span>
                <select
                  name="metodo"
                  defaultValue={filtros.metodo ?? ""}
                  className={INPUT_CLASS}
                >
                  <option value="">Todos</option>
                  <option value="portal">Portal</option>
                  <option value="email">E-mail</option>
                  <option value="outro">Outro</option>
                </select>
              </label>
              <div className="flex items-center gap-3 sm:col-span-3">
                <button type="submit" className={SECONDARY_BUTTON_CLASS}>
                  Aplicar filtros
                </button>
                <Link
                  href={hrefPainel(base, {})}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Limpar
                </Link>
              </div>
            </div>
          </details>
        </form>
      </section>

      {perms.operar && linhasOrdenadas.length > 0 && (
        <details className={`${CARD_CLASS} group p-4`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
            Ações em lote
            <ChevronDown
              size={16}
              className="text-ink-muted transition group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <form
            id="lote-debitos"
            action={acaoEmLote}
            className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
          >
            <input type="hidden" name="competencia" value={competencia} />
            <label>
              <span className={ROTULO}>Com os imóveis selecionados</span>
              <select name="acao" defaultValue="" className={INPUT_CLASS}>
                <option value="">Escolha a ação…</option>
                <option value="cond_sem_debito">Condomínio sem débito</option>
                <option value="iptu_sem_debito">IPTU/TLP sem débito</option>
                <option value="ambos_sem_debito">Tudo sem débito</option>
                <option value="enviar_solicitacao">
                  Pedir posição à administradora
                </option>
                <option value="alterar_administradora">
                  Alterar administradora
                </option>
              </select>
            </label>
            <label>
              <span className={ROTULO}>Administradora de destino</span>
              <select
                name="nova_administradora_id"
                defaultValue=""
                className={INPUT_CLASS}
              >
                <option value="">Somente ao alterar administradora</option>
                {dados.administradoras
                  .filter((administradora) => administradora.ativa)
                  .map((administradora) => (
                    <option key={administradora.id} value={administradora.id}>
                      {administradora.nome}
                    </option>
                  ))}
              </select>
            </label>
            <BotaoEnviar
              className={PRIMARY_BUTTON_CLASS}
              textoEnviando="Aplicando…"
            >
              Aplicar
            </BotaoEnviar>
          </form>
        </details>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Fila do mês</h2>
          <p className="text-xs text-ink-muted">
            Pendências e débitos aparecem primeiro.
          </p>
        </div>
        <span className="text-xs text-ink-muted">
          {linhasOrdenadas.length} de {dados.linhas.length} imóveis
        </span>
      </div>

      {linhasOrdenadas.length === 0 ? (
        <div className={`${CARD_CLASS} px-6 py-12 text-center`}>
          <Check size={28} className="mx-auto text-emerald-600" />
          <p className="mt-3 text-sm font-semibold text-ink">
            Nada encontrado nesta visão
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Ajuste os filtros ou consulte outra situação.
          </p>
        </div>
      ) : (
        <>
          <div className={`${CARD_CLASS} hidden overflow-x-auto md:block`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  {perms.operar && (
                    <th className="w-10 px-3 py-3">
                      <SelecionarTodos formId="lote-debitos" />
                    </th>
                  )}
                  <th className="px-3 py-3 font-medium">Imóvel</th>
                  <th className="px-3 py-3 font-medium">Condomínio</th>
                  <th className="px-3 py-3 font-medium">IPTU/TLP</th>
                  <th className="min-w-[290px] px-3 py-3 font-medium">
                    Próxima ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {linhasOrdenadas.map((linha) => {
                  const acao = acaoNecessaria(linha);
                  return (
                    <tr
                      key={linha.contratoId}
                      className="hover:bg-background/60"
                    >
                      {perms.operar && (
                        <td className="px-3 py-4 align-top">
                          <input
                            type="checkbox"
                            name="contratos"
                            value={linha.contratoId}
                            form="lote-debitos"
                            aria-label={`Selecionar ${linha.imovel}`}
                          />
                        </td>
                      )}
                      <td className="max-w-[330px] px-3 py-4 align-top">
                        <Link
                          href={hrefDetalhe(linha)}
                          scroll={false}
                          className="font-semibold text-ink hover:text-brand hover:underline"
                        >
                          {linha.imovel}
                        </Link>
                        <p className="mt-1 truncate text-xs text-ink-muted">
                          {[linha.inquilino, linha.administradoraNome]
                            .filter(Boolean)
                            .join(" · ") || "Sem informações complementares"}
                        </p>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <SeloStatus status={linha.condominio?.status} />
                      </td>
                      <td className="px-3 py-4 align-top">
                        <SeloStatus status={linha.iptu?.status} />
                      </td>
                      <td className="px-3 py-4 align-top">
                        <p className={`mb-2 text-xs ${TOM_ACAO[acao.tom]}`}>
                          {acao.texto}
                        </p>
                        {perms.operar ? (
                          <AcoesRapidas
                            linha={linha}
                            competencia={competencia}
                            hrefDetalhe={hrefDetalhe(linha)}
                          />
                        ) : (
                          <Link
                            href={hrefDetalhe(linha)}
                            scroll={false}
                            className="text-xs font-semibold text-brand hover:underline"
                          >
                            Ver detalhes
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {perms.operar && (
              <li className="flex items-center gap-2 px-1 text-xs text-ink-muted">
                <SelecionarTodos formId="lote-debitos" /> Selecionar todos
              </li>
            )}
            {linhasOrdenadas.map((linha) => {
              const acao = acaoNecessaria(linha);
              return (
                <li key={linha.contratoId} className={`${CARD_CLASS} p-4`}>
                  <div className="flex items-start gap-3">
                    {perms.operar && (
                      <input
                        type="checkbox"
                        name="contratos"
                        value={linha.contratoId}
                        form="lote-debitos"
                        className="mt-1"
                        aria-label={`Selecionar ${linha.imovel}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={hrefDetalhe(linha)}
                        scroll={false}
                        className="font-semibold text-ink"
                      >
                        {linha.imovel}
                      </Link>
                      <p className="mt-1 truncate text-xs text-ink-muted">
                        {[linha.inquilino, linha.administradoraNome]
                          .filter(Boolean)
                          .join(" · ") || "Sem informações complementares"}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="mb-1 text-ink-muted">Condomínio</p>
                          <SeloStatus status={linha.condominio?.status} />
                        </div>
                        <div>
                          <p className="mb-1 text-ink-muted">IPTU/TLP</p>
                          <SeloStatus status={linha.iptu?.status} />
                        </div>
                      </div>
                      <p className={`mt-3 text-xs ${TOM_ACAO[acao.tom]}`}>
                        {acao.texto}
                      </p>
                      {perms.operar && (
                        <div className="mt-3">
                          <AcoesRapidas
                            linha={linha}
                            competencia={competencia}
                            hrefDetalhe={hrefDetalhe(linha)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
