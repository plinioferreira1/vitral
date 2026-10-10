import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { CARD_CLASS, INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { localDe, somarDias } from "@/lib/dp/ponto";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { acessoDP } from "../dados";
import { Cartao, FormDocumento, ListaDocumentos } from "../listas";
import { ROTULO } from "../ui";

export default async function DocumentosPage({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string; colaborador?: string; vencimento?: string }> }) {
  const sp = await searchParams;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoDP(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado || !acesso.perms.ver) redirect("/");
  const hoje = localDe(new Date().toISOString()).data;
  const alertaAte = somarDias(hoje, acesso.config.documentosAlertaDias);
  const [{ data: colaboradores }, { data: documentos }] = await Promise.all([
    supabase.from("dp_colaboradores").select("id, nome, status").order("nome"),
    supabase.from("dp_documentos").select("*").order("criado_em", { ascending: false }).limit(1000),
  ]);
  const nomes = new Map((colaboradores ?? []).map((c) => [c.id, c.nome]));
  const q = (sp.q ?? "").trim().toLowerCase();
  const lista = (documentos ?? [])
    .filter((d) => !sp.categoria || d.categoria === sp.categoria)
    .filter((d) => !sp.colaborador || d.colaborador_id === sp.colaborador)
    .filter((d) => sp.vencimento !== "sim" || (!!d.vencimento && d.vencimento <= alertaAte))
    .filter((d) => !q || `${d.titulo} ${nomes.get(d.colaborador_id) ?? ""} ${d.observacao ?? ""}`.toLowerCase().includes(q));
  const alertas = (documentos ?? []).filter((d) => d.vencimento && d.vencimento <= alertaAte).length;
  const admin = acesso.perms.administrador;

  return (
    <div className="mx-auto w-full min-w-0 space-y-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Documentos</h1>
        <p className="mt-1 text-sm text-ink-muted">{admin ? "Contratos, termos, atestados e recibos de cada colaborador, em pasta privada." : "Seus documentos guardados pela empresa."}</p>
      </div>
      {alertas > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          {alertas} documento(s) vencido(s) ou vencendo nos próximos {acesso.config.documentosAlertaDias} dias.{" "}
          <a href="/dp/documentos?vencimento=sim" className="font-semibold underline">
            Ver só esses
          </a>
        </p>
      )}
      {admin && (
        <Cartao titulo="Adicionar documento">
          <FormDocumento config={acesso.config} colaboradores={(colaboradores ?? []).filter((c) => c.status !== "desligado")} colaboradorId={sp.colaborador} />
        </Cartao>
      )}
      <form method="get" className={`${CARD_CLASS} grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end`}>
        <label className="block">
          <span className={ROTULO}>Buscar</span>
          <span className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Título, colaborador ou observação" className={`${INPUT_CLASS} pl-9`} />
          </span>
        </label>
        <label className="block">
          <span className={ROTULO}>Categoria</span>
          <select name="categoria" defaultValue={sp.categoria ?? ""} className={INPUT_CLASS}>
            <option value="">Todas</option>
            {acesso.config.tiposDocumento.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        {admin ? (
          <label className="block">
            <span className={ROTULO}>Colaborador</span>
            <select name="colaborador" defaultValue={sp.colaborador ?? ""} className={INPUT_CLASS}>
              <option value="">Todos</option>
              {(colaboradores ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span />
        )}
        <button type="submit" className={SECONDARY_BUTTON_CLASS}>
          Filtrar
        </button>
      </form>
      <Cartao>
        <ListaDocumentos documentos={lista} nomes={admin ? nomes : undefined} hoje={hoje} alertaAte={alertaAte} podeExcluir={admin} />
      </Cartao>
    </div>
  );
}
