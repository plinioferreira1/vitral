import Link from "next/link";
import { Search } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { SelecionarTodos } from "@/components/selecionar-todos";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import type { PermissoesDebitos } from "@/lib/debitos/permissoes";
import { acaoNecessaria, resumirPainel, rotuloCompetencia, type FiltrosPainel } from "@/lib/debitos/regras";
import { acaoEmLote } from "../actions";
import type { DadosPainel } from "../dados";
import { ROTULO, SeloMetodo, SeloStatus, hrefPainel } from "./ui";

type Linha = DadosPainel["linhas"][number];

const TOM_ACAO = { ok: "text-emerald-700", pendente: "text-amber-800", debito: "font-semibold text-rose-700" } as const;

function Indicador({ rotulo, valor, detalhe, href, tom }: { rotulo: string; valor: string; detalhe?: string; href: string; tom?: "alerta" | "ok" | "debito" }) {
  const cor = tom === "debito" ? "text-rose-700" : tom === "alerta" ? "text-amber-700" : tom === "ok" ? "text-emerald-700" : "text-ink";
  return (
    <Link href={href} scroll={false} className={`${CARD_CLASS} block px-4 py-3 transition hover:border-brand/40`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{rotulo}</p>
      <p className={`num mt-1 text-2xl font-semibold ${cor}`}>{valor}</p>
      {detalhe && <p className="text-[11px] text-ink-muted">{detalhe}</p>}
    </Link>
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
  /** linhas já filtradas */
  linhas: Linha[];
  competencia: string;
  params: Record<string, string | undefined>;
  filtros: FiltrosPainel;
  perms: PermissoesDebitos;
}) {
  const resumo = resumirPainel(dados.linhas);
  const base = { mes: params.mes };
  const temFiltro = !!(filtros.q || filtros.situacao || filtros.tipo || filtros.administradoraId || filtros.metodo);
  const faltam = resumo.condominio.pendentes + resumo.iptu.pendentes;
  const debitos = resumo.condominio.comDebito + resumo.iptu.comDebito;
  const hrefDetalhe = (l: Linha) => hrefPainel(params, { detalhe: l.contratoId });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Indicador rotulo="Imóveis ativos" valor={String(resumo.imoveis)} href={hrefPainel(base, {})} />
        <Indicador
          rotulo="Condomínios verificados"
          valor={`${resumo.condominio.verificados}/${resumo.condominio.total}`}
          href={hrefPainel(base, { situacao: "verificado", tipo: "condominio" })}
          tom={resumo.condominio.total > 0 && resumo.condominio.verificados === resumo.condominio.total ? "ok" : undefined}
        />
        <Indicador
          rotulo="Condomínios pendentes"
          valor={String(resumo.condominio.pendentes)}
          detalhe="inclui aguardando resposta"
          href={hrefPainel(base, { situacao: "pendente", tipo: "condominio" })}
          tom={resumo.condominio.pendentes > 0 ? "alerta" : "ok"}
        />
        <Indicador
          rotulo="IPTU/TLP verificados"
          valor={`${resumo.iptu.verificados}/${resumo.iptu.total}`}
          href={hrefPainel(base, { situacao: "verificado", tipo: "iptu_tlp" })}
          tom={resumo.iptu.total > 0 && resumo.iptu.verificados === resumo.iptu.total ? "ok" : undefined}
        />
        <Indicador
          rotulo="IPTU/TLP pendentes"
          valor={String(resumo.iptu.pendentes)}
          href={hrefPainel(base, { situacao: "pendente", tipo: "iptu_tlp" })}
          tom={resumo.iptu.pendentes > 0 ? "alerta" : "ok"}
        />
        <Indicador rotulo="Débitos identificados" valor={String(debitos)} href={hrefPainel(base, { situacao: "com_debito" })} tom={debitos > 0 ? "debito" : "ok"} />
      </div>

      <p className="text-sm text-ink">
        {dados.verificacoes.length === 0
          ? `Ainda não há conferências geradas para ${rotuloCompetencia(competencia)}.`
          : faltam === 0
            ? `Tudo conferido em ${rotuloCompetencia(competencia)}.${debitos ? ` ${debitos} débito(s) identificado(s).` : ""}`
            : `Em ${rotuloCompetencia(competencia)} ainda faltam ${faltam} conferência(s): ${resumo.condominio.pendentes} de condomínio e ${resumo.iptu.pendentes} de IPTU/TLP.`}
      </p>

      {/* filtros */}
      <form method="get" className={`${CARD_CLASS} grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6`}>
        {params.mes && <input type="hidden" name="mes" value={params.mes} />}
        <label className="block sm:col-span-2">
          <span className={ROTULO}>Buscar</span>
          <span className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input name="q" defaultValue={filtros.q ?? ""} placeholder="Imóvel, endereço, condomínio ou inquilino" className={`${INPUT_CLASS} pl-9`} />
          </span>
        </label>
        <label className="block">
          <span className={ROTULO}>Situação</span>
          <select name="situacao" defaultValue={filtros.situacao ?? ""} className={INPUT_CLASS}>
            <option value="">Todas</option>
            <option value="pendente">Pendente</option>
            <option value="aguardando">Aguardando administradora</option>
            <option value="verificado">Verificado</option>
            <option value="com_debito">Com débito</option>
          </select>
        </label>
        <label className="block">
          <span className={ROTULO}>Tipo</span>
          <select name="tipo" defaultValue={filtros.tipo ?? ""} className={INPUT_CLASS}>
            <option value="">Condomínio e IPTU/TLP</option>
            <option value="condominio">Condomínio</option>
            <option value="iptu_tlp">IPTU/TLP</option>
          </select>
        </label>
        <label className="block">
          <span className={ROTULO}>Administradora</span>
          <select name="adm" defaultValue={filtros.administradoraId ?? ""} className={INPUT_CLASS}>
            <option value="">Todas</option>
            <option value="sem">Sem administradora</option>
            {dados.administradoras.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={ROTULO}>Método</span>
          <select name="metodo" defaultValue={filtros.metodo ?? ""} className={INPUT_CLASS}>
            <option value="">Todos</option>
            <option value="portal">Portal</option>
            <option value="email">E-mail</option>
            <option value="outro">Outro</option>
          </select>
        </label>
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className={SECONDARY_BUTTON_CLASS}>
            Filtrar
          </button>
          {temFiltro && (
            <Link href={hrefPainel(base, {})} className="text-xs font-medium text-brand hover:underline">
              Limpar filtros
            </Link>
          )}
          <span className="ml-auto text-xs text-ink-muted">
            {linhas.length} de {dados.linhas.length} imóvel(is)
          </span>
        </div>
      </form>

      {/* ações em lote */}
      {perms.operar && linhas.length > 0 && (
        <form id="lote-debitos" action={acaoEmLote} className={`${CARD_CLASS} flex flex-wrap items-end gap-3 p-4`}>
          <input type="hidden" name="competencia" value={competencia} />
          <label className="block min-w-[220px] flex-1">
            <span className={ROTULO}>Com os imóveis selecionados</span>
            <select name="acao" defaultValue="" className={INPUT_CLASS}>
              <option value="">Escolha a ação…</option>
              <option value="cond_sem_debito">Marcar condomínio como sem débito</option>
              <option value="iptu_sem_debito">Marcar IPTU/TLP como sem débito</option>
              <option value="ambos_sem_debito">Registrar ambos como verificados, sem débito</option>
              <option value="enviar_solicitacao">Enviar solicitação à administradora</option>
              <option value="alterar_administradora">Alterar administradora</option>
            </select>
          </label>
          <label className="block min-w-[200px] flex-1">
            <span className={ROTULO}>Nova administradora (só para alterar)</span>
            <select name="nova_administradora_id" defaultValue="" className={INPUT_CLASS}>
              <option value="">—</option>
              {dados.administradoras
                .filter((a) => a.ativa)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
            </select>
          </label>
          <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Aplicando…">
            Aplicar
          </BotaoEnviar>
        </form>
      )}

      {linhas.length === 0 ? (
        <div className={`${CARD_CLASS} px-6 py-10 text-center text-sm text-ink-muted`}>{temFiltro ? "Nenhum imóvel com esses filtros." : "Nenhum contrato de locação ativo."}</div>
      ) : (
        <>
          {/* computador: tabela */}
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
                  <th className="px-3 py-3 font-medium">Inquilino</th>
                  <th className="px-3 py-3 font-medium">Condomínio</th>
                  <th className="px-3 py-3 font-medium">Método</th>
                  <th className="px-3 py-3 font-medium">IPTU/TLP</th>
                  <th className="px-3 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {linhas.map((l) => {
                  const acao = acaoNecessaria(l);
                  return (
                    <tr key={l.contratoId} className="hover:bg-background/60">
                      {perms.operar && (
                        <td className="px-3 py-3">
                          <input type="checkbox" name="contratos" value={l.contratoId} form="lote-debitos" aria-label={`Selecionar ${l.imovel}`} />
                        </td>
                      )}
                      <td className="max-w-[280px] px-3 py-3">
                        <Link href={hrefDetalhe(l)} scroll={false} className="font-medium text-ink hover:text-brand hover:underline">
                          {l.imovel}
                        </Link>
                        {(l.condominioNome || l.administradoraNome) && <p className="truncate text-xs text-ink-muted">{[l.condominioNome, l.administradoraNome].filter(Boolean).join(" · ")}</p>}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-3 text-ink-muted">{l.inquilino ?? "—"}</td>
                      <td className="px-3 py-3">
                        <SeloStatus status={l.condominio?.status} />
                      </td>
                      <td className="px-3 py-3">
                        <SeloMetodo metodo={l.metodo} />
                      </td>
                      <td className="px-3 py-3">
                        <SeloStatus status={l.iptu?.status} />
                      </td>
                      <td className={`px-3 py-3 text-xs ${TOM_ACAO[acao.tom]}`}>
                        <Link href={hrefDetalhe(l)} scroll={false} className="hover:underline">
                          {acao.texto}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* celular: cartões */}
          <ul className="space-y-3 md:hidden">
            {perms.operar && (
              <li className="flex items-center gap-2 px-1 text-xs text-ink-muted">
                <SelecionarTodos formId="lote-debitos" /> Selecionar todos
              </li>
            )}
            {linhas.map((l) => {
              const acao = acaoNecessaria(l);
              return (
                <li key={l.contratoId} className={`${CARD_CLASS} p-4`}>
                  <div className="flex items-start gap-3">
                    {perms.operar && <input type="checkbox" name="contratos" value={l.contratoId} form="lote-debitos" className="mt-1" aria-label={`Selecionar ${l.imovel}`} />}
                    <Link href={hrefDetalhe(l)} scroll={false} className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{l.imovel}</p>
                      <p className="truncate text-xs text-ink-muted">{[l.inquilino, l.administradoraNome].filter(Boolean).join(" · ") || "—"}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="mb-1 text-ink-muted">Condomínio</p>
                          <SeloStatus status={l.condominio?.status} />
                        </div>
                        <div>
                          <p className="mb-1 text-ink-muted">IPTU/TLP</p>
                          <SeloStatus status={l.iptu?.status} />
                        </div>
                      </div>
                      <p className={`mt-3 text-xs ${TOM_ACAO[acao.tom]}`}>
                        {acao.texto}
                        {l.metodo ? <span className="font-normal text-ink-muted"> · método: {l.metodo === "portal" ? "portal" : l.metodo === "email" ? "e-mail" : "outro"}</span> : null}
                      </p>
                    </Link>
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
