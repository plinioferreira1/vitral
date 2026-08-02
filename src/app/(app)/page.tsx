import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosCalendario } from "@/lib/queries";
import { formatarPrazo } from "@/lib/alertas";
import { CATEGORIA_LABEL } from "@/lib/types";
import { CalendarioGrid } from "@/components/calendario-grid";
import { ResumoPrazos } from "@/components/resumo-prazos";
import { InicioCorretor } from "@/components/inicio-corretor";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const URGENCIA_BARRA: Record<string, string> = {
  atrasada: "border-l-rose-500",
  vence_hoje: "border-l-amber-500",
  vence_em_breve: "border-l-amber-400",
  no_prazo: "border-l-emerald-500",
  concluida: "border-l-stone-300",
  sem_data: "border-l-stone-300",
};

const FILTRO_LABEL: Record<string, string> = {
  atrasada: "Atrasados",
  vence_hoje: "Vencendo hoje",
  vence_em_breve: "Vencendo em 7 dias",
  em_aberto: "Em aberto",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, nivel_acesso, tenant_id")
    .eq("id", user?.id ?? "")
    .single();

  if (usuario?.nivel_acesso === "corretor") {
    const { data: simulacoes } = await supabase
      .from("simulacoes_custas")
      .select("id, valor, tipo_imovel, valor_financiado, primeiro_imovel, instrumento_particular, total, criado_em")
      .eq("usuario_id", user?.id ?? "")
      .order("criado_em", { ascending: false })
      .limit(5);

    const { data: tenant } = await supabase
      .from("tenants")
      .select("whatsapp_contato")
      .eq("id", usuario.tenant_id ?? "")
      .single();

    return (
      <InicioCorretor
        nome={usuario.nome}
        simulacoes={simulacoes ?? []}
        whatsappContato={tenant?.whatsapp_contato ?? null}
      />
    );
  }

  const eventos = await getEventosCalendario();
  // Resumo combinado das 3 categorias (Venda, Financiamento e Locação).
  // Cada usuário só vê o que tem permissão de categoria pra ver — a
  // consulta já respeita isso (RLS por tenant/categoria).
  const pendentes = eventos.filter((e) => !e.concluida);

  const atrasados = pendentes.filter((e) => e.urgencia === "atrasada");
  const venceHoje = pendentes.filter((e) => e.urgencia === "vence_hoje");
  const venceEmBreve = pendentes.filter((e) => e.urgencia === "vence_em_breve");

  const todosCriticos = [...atrasados, ...venceHoje, ...venceEmBreve].sort(
    (a, b) => (a.diasParaVencer ?? 0) - (b.diasParaVencer ?? 0)
  );
  const todosPendentesOrdenados = [...pendentes].sort(
    (a, b) => (a.diasParaVencer ?? 9999) - (b.diasParaVencer ?? 9999)
  );

  const criticos =
    filtro === "em_aberto"
      ? todosPendentesOrdenados
      : filtro
        ? todosCriticos.filter((e) => e.urgencia === filtro).slice(0, 20)
        : todosCriticos.slice(0, 10);

  const referencia = new Date();
  const mesReferenciaLabel = format(referencia, "MMMM 'de' yyyy", { locale: ptBR });
  const mesReferenciaCapitalizado =
    mesReferenciaLabel.charAt(0).toUpperCase() + mesReferenciaLabel.slice(1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Início</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Gestão processual completa de fluxos de vendas, financiamentos e locações. Tudo em um só
          lugar.
        </p>
        <p className="mt-0.5 text-xs font-medium text-ink-muted/80">
          {mesReferenciaCapitalizado}
        </p>
      </div>

      <ResumoPrazos
        eventos={eventos}
        hrefEmAberto="/?filtro=em_aberto"
        hrefFiltro={(f) => `/?filtro=${f}`}
        filtroAtivo={filtro}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Calendário</h2>
            <Link href="/calendario" className="text-xs font-medium text-brand hover:underline">
              Abrir calendário completo →
            </Link>
          </div>
          <CalendarioGrid eventos={eventos} referencia={referencia} maxPorDia={2} />
        </div>

        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              {filtro ? FILTRO_LABEL[filtro] ?? "Prazos críticos" : "Prazos críticos"}
            </h2>
            {filtro && (
              <Link href="/" className="text-xs text-ink-muted hover:underline">
                limpar filtro
              </Link>
            )}
          </div>
          {criticos.length === 0 ? (
            <p className="rounded-xl border border-border/60 bg-surface p-5 text-center text-sm text-ink-muted">
              {filtro ? "Nada aqui." : "Nenhum prazo atrasado ou vencendo nos próximos dias. 🎉"}
            </p>
          ) : (
            <ul
              className={`space-y-2 ${
                filtro === "em_aberto" ? "max-h-[70vh] overflow-y-auto pr-1" : ""
              }`}
            >
              {criticos.map((e) => (
                <li
                  key={e.id}
                  className={`rounded-lg border border-l-[3px] border-border bg-surface p-3 ${URGENCIA_BARRA[e.urgencia]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={e.href} className="text-xs font-medium text-ink hover:underline">
                      {e.titulo}
                    </Link>
                    <span className="shrink-0 text-[10px] font-medium text-ink-muted">
                      {formatarPrazo(e.diasParaVencer)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {CATEGORIA_LABEL[e.categoria]}
                    {e.responsavelNome ? ` · ${e.responsavelNome}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <div className="flex gap-3">
        <Link
          href="/processos/novo"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo processo
        </Link>
        <Link
          href="/processos"
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-background"
        >
          Ver todos os processos
        </Link>
      </div>
    </div>
  );
}


