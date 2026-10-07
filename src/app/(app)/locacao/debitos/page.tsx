import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import {
  METODOS_CONSULTA,
  SITUACOES_FILTRO,
  TIPOS_VERIFICACAO,
  competenciaDe,
  filtrarLinhas,
  normalizarCompetencia,
  rotuloCompetencia,
  somarMeses,
  type FiltrosPainel,
} from "@/lib/debitos/regras";
import { gerarCompetencia } from "@/lib/debitos/rotina";
import { obterProvedorTributos } from "@/lib/debitos/tributos";
import { hojeISO } from "@/lib/data-br";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { gerarCompetenciaManual } from "./actions";
import { carregarDetalhe, carregarPainel, carregarPermissoes } from "./dados";
import { Administradoras } from "./_componentes/administradoras";
import { Configuracoes } from "./_componentes/configuracoes";
import { DetalheImovel } from "./_componentes/detalhe-imovel";
import { ModalDetalhe } from "./_componentes/modal-detalhe";
import { Painel } from "./_componentes/painel";
import { Solicitacoes } from "./_componentes/solicitacoes";
import { hrefPainel } from "./_componentes/ui";

const ABAS = [
  ["painel", "Conferência do mês"],
  ["solicitacoes", "Solicitações"],
  ["ajustes", "Ajustes"],
] as const;
type Aba = (typeof ABAS)[number][0];

const daLista = <T extends string>(lista: readonly T[], valor: string | undefined): T | null => ((lista as readonly string[]).includes(valor ?? "") ? (valor as T) : null);

export default async function ControleDebitosPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; mes?: string; q?: string; situacao?: string; tipo?: string; adm?: string; metodo?: string; detalhe?: string }>;
}) {
  const sp = await searchParams;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const perms = await carregarPermissoes(supabase, user.id, usuario.nivel_acesso);
  if (!perms.ver) redirect("/");
  const tenantId = usuario.tenant_id;

  const atual = competenciaDe(hojeISO());
  const competencia = normalizarCompetencia(sp.mes) ?? atual;
  const abaLegada = sp.aba === "administradoras" || sp.aba === "configuracoes" ? "ajustes" : sp.aba === "iptu" ? "painel" : sp.aba;
  const aba: Aba = daLista(
    ABAS.map((a) => a[0]),
    abaLegada
  ) ?? "painel";

  let dados = await carregarPainel(supabase, tenantId, competencia);
  // Se o mês corrente ainda não foi gerado (ou entrou contrato novo), gera ao abrir —
  // a rotina diária faz o mesmo; a restrição única do banco impede duplicidade.
  if (competencia === atual && perms.operar && dados.config.geracao_automatica) {
    const semConferencia = dados.contratos.some((c) => c.ativo && !dados.verificacoes.some((v) => v.contrato_id === c.id));
    if (semConferencia) {
      const r = await gerarCompetencia(supabase, tenantId, competencia, { autor: { id: user.id, nome: usuario.nome }, config: dados.config });
      if (r.criadas > 0) dados = await carregarPainel(supabase, tenantId, competencia);
    }
  }

  const filtros: FiltrosPainel = {
    q: (sp.q ?? "").trim().slice(0, 80) || undefined,
    situacao: daLista(SITUACOES_FILTRO, sp.situacao),
    tipo: daLista(TIPOS_VERIFICACAO, sp.tipo) ?? (sp.aba === "iptu" ? "iptu_tlp" : null),
    administradoraId: sp.adm === "sem" || dados.administradoras.some((a) => a.id === sp.adm) ? sp.adm : null,
    metodo: daLista(METODOS_CONSULTA, sp.metodo),
  };
  const params: Record<string, string | undefined> = {
    aba: aba === "painel" ? undefined : aba,
    mes: competencia === atual ? undefined : competencia.slice(0, 7),
    q: filtros.q,
    situacao: filtros.situacao ?? undefined,
    tipo: filtros.tipo ?? undefined,
    adm: filtros.administradoraId ?? undefined,
    metodo: filtros.metodo ?? undefined,
  };
  const idsFiltrados = new Set(filtrarLinhas(dados.linhas, filtros).map((l) => l.contratoId));
  const linhasFiltradas = dados.linhas.filter((l) => idsFiltrados.has(l.contratoId));

  const linhaDetalhe = sp.detalhe ? dados.linhas.find((l) => l.contratoId === sp.detalhe) : undefined;
  const [detalhe, eventosRecentes] = await Promise.all([
    linhaDetalhe
      ? carregarDetalhe(supabase, linhaDetalhe.contratoId, [linhaDetalhe.verificacaoCondominio?.id, linhaDetalhe.verificacaoIptu?.id].filter(Boolean) as string[])
      : Promise.resolve(null),
    aba === "ajustes" ? supabase.from("debitos_eventos").select("*").order("criado_em", { ascending: false }).limit(40) : Promise.resolve({ data: [] }),
  ]);
  const urlIptu = obterProvedorTributos(dados.config).urlConsulta(null);
  const mesHref = (c: string) => hrefPainel({ aba: params.aba }, { mes: c === atual ? null : c.slice(0, 7) });
  const naoGerada = dados.verificacoes.length === 0 && dados.contratos.some((c) => c.ativo);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">Controle de Débitos</h1>
          <p className="text-sm text-ink-muted">Conferência mensal de condomínio e IPTU/TLP dos imóveis administrados.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
          <Link href={mesHref(somarMeses(competencia, -1))} aria-label="Mês anterior" className="rounded-lg p-2 text-ink-muted hover:bg-background">
            <ChevronLeft size={16} />
          </Link>
          <span className="min-w-[132px] text-center text-sm font-semibold text-ink">{rotuloCompetencia(competencia)}</span>
          <Link href={mesHref(somarMeses(competencia, 1))} aria-label="Próximo mês" className="rounded-lg p-2 text-ink-muted hover:bg-background">
            <ChevronRight size={16} />
          </Link>
          {competencia !== atual && (
            <Link href={mesHref(atual)} className="rounded-lg px-2 py-1.5 text-xs font-medium text-brand hover:bg-background">
              Mês atual
            </Link>
          )}
        </div>
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1">
        {ABAS.map(([id, rotulo]) => (
          <Link
            key={id}
            href={hrefPainel({ mes: params.mes }, { aba: id === "painel" ? null : id })}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${aba === id ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink"}`}
          >
            {rotulo}
          </Link>
        ))}
      </nav>

      {naoGerada && aba !== "ajustes" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>As conferências de {rotuloCompetencia(competencia)} ainda não foram geradas.</p>
          {perms.operar && (
            <form action={gerarCompetenciaManual}>
              <input type="hidden" name="competencia" value={competencia} />
              <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Gerando…">
                Gerar conferências deste mês
              </BotaoEnviar>
            </form>
          )}
        </div>
      )}

      {aba === "painel" && <Painel dados={dados} linhas={linhasFiltradas} competencia={competencia} params={params} filtros={filtros} perms={perms} />}
      {aba === "solicitacoes" && <Solicitacoes dados={dados} competencia={competencia} params={params} perms={perms} agoraIso={new Date().toISOString()} />}
      {aba === "ajustes" && (
        <div className="space-y-8">
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Administradoras</h2>
              <p className="text-sm text-ink-muted">Cadastre os contatos e defina como cada condomínio é consultado.</p>
            </div>
            <Administradoras dados={dados} perms={perms} />
          </section>
          <section className="space-y-3 border-t border-border pt-7">
            <div>
              <h2 className="text-base font-semibold text-ink">Automação e preferências</h2>
              <p className="text-sm text-ink-muted">Ajustes menos frequentes da rotina mensal.</p>
            </div>
            <Configuracoes config={dados.config} eventos={eventosRecentes.data ?? []} perms={perms} />
          </section>
        </div>
      )}

      {linhaDetalhe && detalhe && (
        <ModalDetalhe key={linhaDetalhe.contratoId} titulo={linhaDetalhe.imovel} subtitulo={`Conferência de ${rotuloCompetencia(competencia)}`} hrefFechar={hrefPainel(params, {})}>
          <DetalheImovel
            linha={linhaDetalhe}
            competencia={competencia}
            tenantId={tenantId}
            administradoras={dados.administradoras}
            solicitacoes={dados.solicitacoes}
            detalhe={detalhe}
            urlIptu={urlIptu}
            perms={perms}
          />
        </ModalDetalhe>
      )}
    </div>
  );
}
