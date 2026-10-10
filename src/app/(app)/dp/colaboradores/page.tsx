import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { dataBR } from "@/lib/ferias/regras";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { acessoDP } from "../dados";
import { Avatar, ROTULO, ROTULO_STATUS_COLAB } from "../ui";

const semAcento = (t: string | null | undefined) => (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function ColaboradoresPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; departamento?: string; empresa?: string }> }) {
  const sp = await searchParams;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoDP(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado || !acesso.perms.ver) redirect("/");
  // quem não gerencia ninguém vai direto para a própria ficha
  if (!acesso.perms.gestorDeEquipe) redirect(acesso.eu ? `/dp/colaboradores/${acesso.eu.id}` : "/dp");

  const { data } = await supabase.from("dp_colaboradores").select("*").order("nome");
  const todos = data ?? [];
  const nome = new Map(todos.map((c) => [c.id, c.nome]));
  const status = ["ativo", "inativo", "desligado", "todos"].includes(sp.status ?? "") ? sp.status! : "ativo";
  const q = semAcento(sp.q).trim();
  const lista = todos
    .filter((c) => status === "todos" || c.status === status)
    .filter((c) => !sp.departamento || c.departamento === sp.departamento)
    .filter((c) => !sp.empresa || c.empresa === sp.empresa)
    .filter((c) => !q || [c.nome, c.cargo, c.departamento, c.email].some((v) => semAcento(v).includes(q)));
  const incompletos = todos.filter((c) => c.status === "ativo" && (!c.data_admissao || !c.vinculo)).length;

  return (
    <div className="mx-auto w-full min-w-0 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Colaboradores</h1>
          <p className="mt-1 text-sm text-ink-muted">{acesso.perms.administrador ? "Cadastro de toda a equipe." : "Sua equipe."} A ficha reúne férias, ponto, ausências e documentos de cada pessoa.</p>
        </div>
        {acesso.perms.administrador && (
          <Link href="/dp/colaboradores/novo" className={PRIMARY_BUTTON_CLASS}>
            <Plus size={16} /> Novo colaborador
          </Link>
        )}
      </div>

      {acesso.perms.administrador && incompletos > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          {incompletos} ficha(s) ainda sem data de admissão ou tipo de vínculo. As fichas iniciais foram criadas a partir dos usuários do Vitral; complete os dados e ligue férias e ponto para quem se aplica.
        </p>
      )}

      <form method="get" className={`${CARD_CLASS} grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end`}>
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className={ROTULO}>Buscar</span>
          <span className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Nome, cargo, departamento ou e-mail" className={`${INPUT_CLASS} pl-9`} />
          </span>
        </label>
        <label className="block">
          <span className={ROTULO}>Situação</span>
          <select name="status" defaultValue={status} className={INPUT_CLASS}>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
            <option value="desligado">Desligados</option>
            <option value="todos">Todos</option>
          </select>
        </label>
        <label className="block">
          <span className={ROTULO}>Empresa</span>
          <select name="empresa" defaultValue={sp.empresa ?? ""} className={INPUT_CLASS}>
            <option value="">Todas</option>
            {acesso.config.empresas.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={ROTULO}>Departamento</span>
          <select name="departamento" defaultValue={sp.departamento ?? ""} className={INPUT_CLASS}>
            <option value="">Todos</option>
            {acesso.config.departamentos.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <button type="submit" className={SECONDARY_BUTTON_CLASS}>
          Filtrar
        </button>
      </form>

      {lista.length === 0 ? (
        <p className={`${CARD_CLASS} px-6 py-10 text-center text-sm text-ink-muted`}>Nenhum colaborador com esses filtros.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((c) => (
            <li key={c.id}>
              <Link href={`/dp/colaboradores/${c.id}`} className={`${CARD_CLASS} flex h-full items-start gap-3 p-4 transition hover:border-brand/40`}>
                <Avatar c={c} tamanho={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{c.nome}</span>
                  <span className="block truncate text-xs text-ink-muted">{[c.cargo, c.departamento].filter(Boolean).join(" · ") || "Cargo não informado"}</span>
                  <span className="mt-1 block truncate text-[11px] text-ink-muted">
                    {[c.empresa, c.vinculo, c.data_admissao ? `desde ${dataBR(c.data_admissao)}` : null, c.gestor_id ? `gestor: ${nome.get(c.gestor_id)?.split(" ")[0] ?? "—"}` : null].filter(Boolean).join(" · ") || "Ficha incompleta"}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {c.status !== "ativo" && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">{ROTULO_STATUS_COLAB[c.status]}</span>}
                    {c.tem_ferias && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-800">Férias</span>}
                    {c.registra_ponto && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">Ponto</span>}
                    {!c.usuario_id && <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-ink-muted">Sem usuário no Vitral</span>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
