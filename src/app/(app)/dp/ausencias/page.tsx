import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { redirect } from "next/navigation";
import { localDe, podeDecidirSobre, somarDias } from "@/lib/dp/ponto";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { acessoDP } from "../dados";
import { Cartao, FormAusencia, ListaAusencias } from "../listas";

export default async function AusenciasPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoDP(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado || !acesso.perms.ver) redirect("/");
  const hoje = localDe(new Date().toISOString()).data;
  const [{ data: colaboradores }, { data: ausencias }] = await Promise.all([
    supabase.from("dp_colaboradores").select("id, nome, gestor_id, status").order("nome"),
    supabase.from("dp_ausencias").select("*").gte("data_fim", somarDias(hoje, -365)).order("data_inicio", { ascending: false }).limit(500),
  ]);
  const todos = colaboradores ?? [];
  const nomes = new Map(todos.map((c) => [c.id, c.nome]));
  const euId = acesso.eu?.id ?? null;
  const decide = (colaboradorId: string) => {
    const alvo = todos.find((c) => c.id === colaboradorId);
    return !!alvo && podeDecidirSobre(acesso.perms, euId, alvo);
  };
  const gerenciaveis = todos.filter((c) => c.status !== "desligado" && decide(c.id));
  const lista = ausencias ?? [];
  const pendentes = lista.filter((a) => a.status === "pendente" && decide(a.colaborador_id));

  return (
    <div className="mx-auto w-full min-w-0 space-y-5">
      <CabecalhoPagina titulo="Ausências e afastamentos" descricao="Faltas, atestados, folgas e licenças. O que for registrado aqui já entra no ponto: dia abonado não vira falta." />

      {pendentes.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-1 text-sm font-semibold text-amber-900">Aguardando sua confirmação ({pendentes.length})</h2>
          <ListaAusencias ausencias={pendentes} nomes={nomes} podeDecidir={() => true} podeCancelar={() => false} />
        </section>
      )}

      {gerenciaveis.length > 0 && (
        <Cartao titulo="Registrar ausência">
          <FormAusencia config={acesso.config} colaboradores={gerenciaveis} proprio={false} />
        </Cartao>
      )}
      {acesso.eu && (
        <Cartao titulo={gerenciaveis.length ? "Enviar uma ausência minha" : "Informar ausência"}>
          <p className="mb-3 text-xs text-ink-muted">Envie o atestado ou a justificativa; o gestor confirma.</p>
          <FormAusencia config={acesso.config} colaboradorId={acesso.eu.id} proprio />
        </Cartao>
      )}

      <Cartao titulo="Últimos 12 meses">
        <ListaAusencias ausencias={lista.filter((a) => !pendentes.includes(a))} nomes={acesso.perms.gestorDeEquipe ? nomes : undefined} podeDecidir={() => false} podeCancelar={(a) => acesso.perms.administrador || (a.colaborador_id === euId && a.status === "pendente")} />
      </Cartao>
    </div>
  );
}
