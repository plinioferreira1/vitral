import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2, Settings } from "lucide-react";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { podeAcessarModulo, podeAprovar, podeConfigurar } from "@/lib/avaliacao/permissoes";
import {
  FINALIDADES,
  MODALIDADES,
  ROTULO_FINALIDADE,
  ROTULO_MODALIDADE_CURTO,
  ROTULO_STATUS,
  ROTULO_TIPOLOGIA,
  STATUS_AVALIACAO,
  type Finalidade,
  type Modalidade,
  type StatusAvaliacao,
  type Tipologia,
} from "@/lib/avaliacao/tipos";
import { formatarDataBR } from "@/lib/data-br";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { carregarConfig, papelDe } from "./dados";
import { SeloStatus, moeda } from "./ui";

export default async function AvaliacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; modalidade?: string; finalidade?: string; status?: string }>;
}) {
  const filtros = await searchParams;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  if (!podeAcessarModulo(usuario.nivel_acesso)) redirect("/");
  const supabase = await createClient();

  let consulta = supabase
    .from("avaliacoes")
    .select(
      "id, codigo, modalidade, finalidade, tipologia, status, titulo, proprietario_nome, bairro, valor_calculado, valor_sugerido, versao_atual, atualizado_em, criado_por"
    )
    .order("atualizado_em", { ascending: false })
    .limit(200);
  const q = (filtros.q ?? "").trim().replace(/[%,()]/g, " ");
  if (q) consulta = consulta.or(`titulo.ilike.%${q}%,proprietario_nome.ilike.%${q}%,codigo.ilike.%${q}%,bairro.ilike.%${q}%`);
  if ((MODALIDADES as readonly string[]).includes(filtros.modalidade ?? "")) consulta = consulta.eq("modalidade", filtros.modalidade!);
  if ((FINALIDADES as readonly string[]).includes(filtros.finalidade ?? "")) consulta = consulta.eq("finalidade", filtros.finalidade!);
  if ((STATUS_AVALIACAO as readonly string[]).includes(filtros.status ?? "")) consulta = consulta.eq("status", filtros.status!);
  else consulta = consulta.neq("status", "arquivado");

  const [{ data: avaliacoes }, config, { data: pessoas }] = await Promise.all([
    consulta,
    carregarConfig(supabase, usuario.tenant_id),
    supabase.from("usuarios").select("id, nome"),
  ]);
  const papel = papelDe({ userId: user.id, nivel: usuario.nivel_acesso }, config);
  const nomes = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));
  const lista = avaliacoes ?? [];
  const aguardando = lista.filter((a) => a.status === "em_revisao" && podeAprovar(papel, a.modalidade as Modalidade));
  const temFiltro = !!(q || filtros.modalidade || filtros.finalidade || filtros.status);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Avaliações de imóveis</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-muted">
            Estudo comercial de preço, para orientar captação e divulgação, e Parecer Técnico de Avaliação Mercadológica (PTAM),
            com revisão e assinatura da avaliadora responsável. Venda e locação são tratadas separadamente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {podeConfigurar(papel) && (
            <Link href="/avaliacoes/configuracao" className={SECONDARY_BUTTON_CLASS}>
              <Settings size={15} /> Configuração
            </Link>
          )}
          <Link href="/avaliacoes/nova" className={PRIMARY_BUTTON_CLASS}>
            <FilePlus2 size={15} /> Nova avaliação
          </Link>
        </div>
      </div>

      {!config.responsavel.usuario_id && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          A avaliadora responsável ainda não está configurada. Sem ela, nenhum PTAM pode ser aprovado.{" "}
          {podeConfigurar(papel) ? (
            <Link href="/avaliacoes/configuracao" className="font-semibold underline">
              Configurar agora
            </Link>
          ) : (
            "Peça a um diretor ou gerente para configurar."
          )}
        </div>
      )}

      {aguardando.length > 0 && (
        <section className={`${CARD_CLASS} faixa-marca p-4 sm:p-5`}>
          <h2 className="text-base font-semibold text-ink">Aguardando a sua aprovação ({aguardando.length})</h2>
          <ul className="mt-3 divide-y divide-border">
            {aguardando.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{a.titulo}</p>
                  <p className="text-xs text-ink-muted">
                    {a.codigo} · {ROTULO_MODALIDADE_CURTO[a.modalidade as Modalidade]} · {ROTULO_FINALIDADE[a.finalidade as Finalidade]} · por{" "}
                    {nomes.get(a.criado_por) ?? "—"}
                  </p>
                </div>
                <Link href={`/avaliacoes/${a.id}?etapa=revisao`} className={PRIMARY_BUTTON_CLASS}>
                  Revisar
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form className={`${CARD_CLASS} grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]`}>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">Buscar</span>
          <input name="q" defaultValue={filtros.q ?? ""} placeholder="Imóvel, proprietário, bairro ou código" className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">Documento</span>
          <select name="modalidade" defaultValue={filtros.modalidade ?? ""} className={INPUT_CLASS}>
            <option value="">Todos</option>
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>
                {ROTULO_MODALIDADE_CURTO[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">Finalidade</span>
          <select name="finalidade" defaultValue={filtros.finalidade ?? ""} className={INPUT_CLASS}>
            <option value="">Todas</option>
            {FINALIDADES.map((f) => (
              <option key={f} value={f}>
                {ROTULO_FINALIDADE[f]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">Situação</span>
          <select name="status" defaultValue={filtros.status ?? ""} className={INPUT_CLASS}>
            <option value="">Em aberto e emitidas</option>
            {STATUS_AVALIACAO.map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className={PRIMARY_BUTTON_CLASS}>
            Filtrar
          </button>
          {temFiltro && (
            <Link href="/avaliacoes" className="pb-2.5 text-xs text-ink-muted hover:text-brand hover:underline">
              Limpar
            </Link>
          )}
        </div>
      </form>

      <section className={`${CARD_CLASS} overflow-hidden`}>
        {lista.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            {temFiltro ? "Nenhuma avaliação encontrada com esses filtros." : "Nenhuma avaliação ainda. Comece por “Nova avaliação”."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {lista.map((a) => (
              <li key={a.id}>
                <Link href={`/avaliacoes/${a.id}`} className="grid gap-2 px-4 py-3.5 hover:bg-background sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{a.titulo}</p>
                      <SeloStatus status={a.status as StatusAvaliacao} />
                      {a.versao_atual > 0 && <span className="text-xs text-ink-muted">versão {a.versao_atual}</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {a.codigo} · {ROTULO_MODALIDADE_CURTO[a.modalidade as Modalidade]} · {ROTULO_FINALIDADE[a.finalidade as Finalidade]} ·{" "}
                      {ROTULO_TIPOLOGIA[a.tipologia as Tipologia]}
                      {a.bairro ? ` · ${a.bairro}` : ""}
                      {a.proprietario_nome ? ` · ${a.proprietario_nome}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-6 text-xs text-ink-muted sm:justify-end">
                    <div className="sm:text-right">
                      <p className="num text-sm font-semibold text-ink">{moeda(a.valor_sugerido === null ? null : Number(a.valor_sugerido), a.finalidade as Finalidade)}</p>
                      <p>calculado: {moeda(a.valor_calculado === null ? null : Number(a.valor_calculado), a.finalidade as Finalidade)}</p>
                    </div>
                    <div className="text-right">
                      <p>{nomes.get(a.criado_por) ?? "—"}</p>
                      <p>{formatarDataBR(a.atualizado_em)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
