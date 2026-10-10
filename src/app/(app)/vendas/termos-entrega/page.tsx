import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, Settings } from "lucide-react";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/server";
import { dataValida } from "@/lib/termo-entrega/calculo";
import { FILTROS_STATUS, STATUS_DO_FILTRO, type FiltroStatus, type StatusTermo } from "@/lib/termo-entrega/conteudo";
import { formatarCentavos } from "@/lib/termo-entrega/extenso";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { cancelarTermo, duplicarTermo } from "./actions";
import { carregarPermissoes } from "./dados";
import { ROTULO, SeloStatusTermo, dataCurta } from "./ui";

const BASE = "/vendas/termos-entrega";
const ROTULO_FILTRO: Record<FiltroStatus, string> = { todos: "Todos", rascunho: "Rascunho", aguardando: "Aguardando assinatura", assinado: "Assinado", cancelado: "Cancelado" };
const ITEM_MENU = "block w-full rounded-md px-3 py-1.5 text-left text-xs text-ink hover:bg-background";

export default async function TermosEntregaPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; de?: string; ate?: string; responsavel?: string }> }) {
  const sp = await searchParams;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const perms = await carregarPermissoes(supabase, user.id, usuario.nivel_acesso);
  if (!perms.ver) redirect("/");

  const filtro: FiltroStatus = (FILTROS_STATUS as readonly string[]).includes(sp.status ?? "") ? (sp.status as FiltroStatus) : "todos";
  const q = (sp.q ?? "").trim().slice(0, 80).replace(/[%,()]/g, " ");
  const de = dataValida(sp.de) ? sp.de : "";
  const ate = dataValida(sp.ate) ? sp.ate : "";

  let consulta = supabase
    .from("termos_entrega")
    .select("id, codigo, status, versao, imovel_endereco, imovel_matricula, compradores_nomes, vendedores_nomes, data_entrega, saldo_centavos, saldo_a_favor, responsavel_id, criado_em")
    .order("criado_em", { ascending: false })
    .limit(300);
  if (filtro !== "todos") consulta = consulta.in("status", STATUS_DO_FILTRO[filtro]);
  if (q) consulta = consulta.or(`imovel_endereco.ilike.%${q}%,compradores_nomes.ilike.%${q}%,vendedores_nomes.ilike.%${q}%,imovel_matricula.ilike.%${q}%,codigo.ilike.%${q}%`);
  if (de) consulta = consulta.gte("data_entrega", de);
  if (ate) consulta = consulta.lte("data_entrega", ate);
  if (sp.responsavel && /^[0-9a-f-]{36}$/i.test(sp.responsavel)) consulta = consulta.eq("responsavel_id", sp.responsavel);

  const [{ data: termos }, { data: pessoas }, { data: contagem }] = await Promise.all([consulta, supabase.from("usuarios").select("id, nome").order("nome"), supabase.from("termos_entrega").select("status")]);
  const nomes = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));
  const lista = termos ?? [];
  const totais = Object.fromEntries(FILTROS_STATUS.map((f) => [f, (contagem ?? []).filter((c) => STATUS_DO_FILTRO[f].includes(c.status as StatusTermo)).length])) as Record<FiltroStatus, number>;
  const temFiltro = !!(q || de || ate || sp.responsavel);
  const href = (status: FiltroStatus) => {
    const p = new URLSearchParams();
    if (status !== "todos") p.set("status", status);
    if (q) p.set("q", q);
    if (de) p.set("de", de);
    if (ate) p.set("ate", ate);
    if (sp.responsavel) p.set("responsavel", sp.responsavel);
    const t = p.toString();
    return t ? `${BASE}?${t}` : BASE;
  };

  const acoes = (t: (typeof lista)[number]) => {
    const status = t.status as StatusTermo;
    return (
      <details className="relative">
        <summary className="cursor-pointer list-none rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-background">Ações ▾</summary>
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          <Link href={`${BASE}/${t.id}`} className={ITEM_MENU}>
            {status === "rascunho" && perms.operar ? "Abrir e editar" : "Abrir"}
          </Link>
          <a href={`${BASE}/${t.id}/pdf`} target="_blank" rel="noreferrer" className={ITEM_MENU}>
            Visualizar PDF
          </a>
          <a href={`${BASE}/${t.id}/pdf?baixar=1`} className={ITEM_MENU}>
            Baixar PDF
          </a>
          {perms.operar && (status === "gerado" || status === "aguardando_assinatura" || status === "parcialmente_assinado") && (
            <Link href={`${BASE}/${t.id}#assinaturas`} className={ITEM_MENU}>
              {status === "gerado" ? "Enviar para assinatura" : "Ver assinaturas"}
            </Link>
          )}
          <Link href={`${BASE}/${t.id}#historico`} className={ITEM_MENU}>
            Ver histórico
          </Link>
          {perms.operar && (
            <form action={duplicarTermo}>
              <input type="hidden" name="id" value={t.id} />
              <BotaoEnviar className={ITEM_MENU} textoEnviando="Duplicando…">
                Duplicar
              </BotaoEnviar>
            </form>
          )}
          {perms.operar && status !== "cancelado" && (
            <form action={cancelarTermo}>
              <input type="hidden" name="id" value={t.id} />
              <BotaoComConfirmacao className={`${ITEM_MENU} !text-rose-700`} textoEnviando="Cancelando…" mensagem={`Cancelar o termo ${t.codigo}? O histórico continua guardado, mas não dá para desfazer.`}>
                Cancelar
              </BotaoComConfirmacao>
            </form>
          )}
        </div>
      </details>
    );
  };

  const saldo = (t: (typeof lista)[number]) =>
    Number(t.saldo_centavos) > 0 ? (
      <>
        <span className="num font-semibold text-ink">{formatarCentavos(Number(t.saldo_centavos))}</span>
        <span className="block text-[11px] text-ink-muted">a favor do {t.saldo_a_favor}</span>
      </>
    ) : (
      <span className="text-ink-muted">Sem saldo</span>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CabecalhoPagina titulo="Termos de Entrega de Chaves" descricao="Entrega das chaves com a proporcionalidade de condomínio, IPTU/TLP e demais encargos entre vendedor e comprador." />
        <div className="flex flex-wrap gap-2">
          {perms.configurar && (
            <Link href={`${BASE}/configuracao`} className={SECONDARY_BUTTON_CLASS}>
              <Settings size={15} /> Modelo
            </Link>
          )}
          {perms.operar && (
            <Link href={`${BASE}/novo`} className={PRIMARY_BUTTON_CLASS}>
              <Plus size={16} /> Novo Termo
            </Link>
          )}
        </div>
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1">
        {FILTROS_STATUS.map((f) => (
          <Link key={f} href={href(f)} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${filtro === f ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink"}`}>
            {ROTULO_FILTRO[f]} <span className="num text-xs opacity-70">{totais[f]}</span>
          </Link>
        ))}
      </nav>

      <form method="get" className={`${CARD_CLASS} grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.2fr_auto] lg:items-end`}>
        {filtro !== "todos" && <input type="hidden" name="status" value={filtro} />}
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className={ROTULO}>Pesquisar</span>
          <span className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input name="q" defaultValue={q} placeholder="Comprador, vendedor, imóvel, matrícula ou código" className={`${INPUT_CLASS} pl-9`} />
          </span>
        </label>
        <label className="block">
          <span className={ROTULO}>Entrega de</span>
          <input type="date" name="de" defaultValue={de} className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className={ROTULO}>até</span>
          <input type="date" name="ate" defaultValue={ate} className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className={ROTULO}>Responsável</span>
          <select name="responsavel" defaultValue={sp.responsavel ?? ""} className={INPUT_CLASS}>
            <option value="">Todos</option>
            {(pessoas ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className={SECONDARY_BUTTON_CLASS}>
            Filtrar
          </button>
          {temFiltro && (
            <Link href={filtro === "todos" ? BASE : `${BASE}?status=${filtro}`} className="text-xs font-medium text-brand hover:underline">
              Limpar
            </Link>
          )}
        </div>
      </form>

      {lista.length === 0 ? (
        <div className={`${CARD_CLASS} px-6 py-12 text-center text-sm text-ink-muted`}>
          {temFiltro || filtro !== "todos" ? "Nenhum termo com esses filtros." : "Nenhum termo de entrega ainda."}
          {perms.operar && !temFiltro && filtro === "todos" && (
            <>
              {" "}
              <Link href={`${BASE}/novo`} className="font-medium text-brand hover:underline">
                Criar o primeiro
              </Link>
              .
            </>
          )}
        </div>
      ) : (
        <>
          <div className={`${CARD_CLASS} hidden lg:block`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  {["Imóvel", "Comprador", "Vendedor", "Entrega", "Saldo do acerto", "Situação", "Responsável", "Criado em", ""].map((c) => (
                    <th key={c} className="px-3 py-3 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((t) => (
                  <tr key={t.id} className="align-top hover:bg-background/60">
                    <td className="max-w-[260px] px-3 py-3">
                      <Link href={`${BASE}/${t.id}`} className="font-medium text-ink hover:text-brand hover:underline">
                        {t.imovel_endereco ?? "Imóvel não informado"}
                      </Link>
                      <p className="num text-[11px] text-ink-muted">
                        {t.codigo} · v{t.versao}
                      </p>
                    </td>
                    <td className="max-w-[160px] px-3 py-3 text-ink-muted">{t.compradores_nomes ?? "—"}</td>
                    <td className="max-w-[160px] px-3 py-3 text-ink-muted">{t.vendedores_nomes ?? "—"}</td>
                    <td className="num whitespace-nowrap px-3 py-3 text-ink-muted">{dataCurta(t.data_entrega)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{saldo(t)}</td>
                    <td className="px-3 py-3">
                      <SeloStatusTermo status={t.status as StatusTermo} />
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{t.responsavel_id ? (nomes.get(t.responsavel_id)?.split(" ")[0] ?? "—") : "—"}</td>
                    <td className="num whitespace-nowrap px-3 py-3 text-ink-muted">{dataCurta(t.criado_em)}</td>
                    <td className="px-3 py-3 text-right">{acoes(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 lg:hidden">
            {lista.map((t) => (
              <li key={t.id} className={`${CARD_CLASS} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <Link href={`${BASE}/${t.id}`} className="min-w-0">
                    <p className="font-medium text-ink">{t.imovel_endereco ?? "Imóvel não informado"}</p>
                    <p className="num text-[11px] text-ink-muted">
                      {t.codigo} · v{t.versao} · criado em {dataCurta(t.criado_em)}
                    </p>
                  </Link>
                  {acoes(t)}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className="text-ink-muted">Comprador</dt>
                    <dd className="text-ink">{t.compradores_nomes ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Vendedor</dt>
                    <dd className="text-ink">{t.vendedores_nomes ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Entrega</dt>
                    <dd className="num text-ink">{dataCurta(t.data_entrega)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Saldo do acerto</dt>
                    <dd>{saldo(t)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <SeloStatusTermo status={t.status as StatusTermo} />
                  <span className="text-xs text-ink-muted">{t.responsavel_id ? nomes.get(t.responsavel_id) : ""}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
