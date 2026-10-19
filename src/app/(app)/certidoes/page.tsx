import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CERTIDOES, resumoProcessos, type ResumoProcessoCertidoes } from "@/lib/certidoes/catalogo";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";

const FILTROS = [
  { chave: "atencao", rotulo: "Pedem atenção" },
  { chave: "pendentes", rotulo: "Com pendências" },
  { chave: "todas", rotulo: "Todas as vendas" },
] as const;
type Filtro = (typeof FILTROS)[number]["chave"];

function hojeSP() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
const dataBR = (iso: string) => iso.split("-").reverse().join("/");

/** Sites agrupados por órgão (TJDFT e TRF1 emitem duas certidões cada). */
function sitesOficiais() {
  const porUrl = new Map<string, { orgao: string; url: string; nomes: string[] }>();
  for (const c of CERTIDOES) {
    const atual = porUrl.get(c.url) ?? { orgao: c.orgao, url: c.url, nomes: [] };
    atual.nomes.push(c.nome);
    porUrl.set(c.url, atual);
  }
  return [...porUrl.values()];
}

function Parte({ rotulo, r }: { rotulo: string; r: ResumoProcessoCertidoes["vendedor"] }) {
  const completo = r.emDia === r.total;
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink-muted">{rotulo}</p>
      <p className={`text-sm font-semibold tabular-nums ${completo ? "text-emerald-700" : "text-ink"}`}>{r.emDia} de {r.total} em dia</p>
      <p className="text-xs text-ink-muted">
        {[
          r.vencida && `${r.vencida} vencida${r.vencida > 1 ? "s" : ""}`,
          r.vence_em_breve && `${r.vence_em_breve} vence${r.vence_em_breve > 1 ? "m" : ""} em breve`,
          r.positiva && `${r.positiva} consta algo`,
          r.pendente && `${r.pendente} pendente${r.pendente > 1 ? "s" : ""}`,
        ].filter(Boolean).join(" · ") || "Tudo em dia"}
      </p>
    </div>
  );
}

export default async function CertidoesPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const sp = await searchParams;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const perms = await getPermissoesUsuario(supabase, user.id, usuario.nivel_acesso);
  if (!perms.temVenda || perms.ehSocialMedia) redirect("/");

  const filtro: Filtro = FILTROS.some((f) => f.chave === sp.filtro) ? (sp.filtro as Filtro) : "atencao";
  const [{ data: processos }, { data: certidoes }] = await Promise.all([
    supabase
      .from("processos")
      .select("id, codigo_san, imoveis ( endereco ), comprador:clientes!processos_comprador_id_fkey ( nome ), vendedor:clientes!processos_vendedor_id_fkey ( nome )")
      .eq("categoria", "venda")
      .not("status", "in", "(concluido,cancelado,arquivado)")
      .limit(500),
    supabase.from("processo_certidoes").select("processo_id, parte, tipo, valida_ate, resultado").limit(5000),
  ]);

  const hoje = hojeSP();
  const linhas = resumoProcessos(
    (processos ?? []).map((p) => {
      const endereco = (p.imoveis as { endereco: string | null } | null)?.endereco;
      const vendedor = (p.vendedor as { nome: string } | null)?.nome;
      const comprador = (p.comprador as { nome: string } | null)?.nome;
      return { id: p.id, titulo: [endereco || (p.codigo_san ? `SAN ${p.codigo_san}` : "Venda sem endereço"), [vendedor, comprador].filter(Boolean).join(" → ")].filter(Boolean).join(" · ") };
    }),
    certidoes ?? [],
    hoje,
  );
  const contagem = { atencao: linhas.filter((l) => l.atencao > 0).length, pendentes: linhas.filter((l) => l.pendentes > 0).length, todas: linhas.length };
  const visiveis = filtro === "atencao" ? linhas.filter((l) => l.atencao > 0) : filtro === "pendentes" ? linhas.filter((l) => l.pendentes > 0) : linhas;

  return (
    <div className="w-full min-w-0 space-y-8">
      <CabecalhoPagina
        titulo="Certidões"
        descricao="Emita as certidões de nada consta nos sites oficiais e anexe no processo de venda. Aqui você acompanha o que falta, o que vence e o que consta algo."
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Sites oficiais</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sitesOficiais().map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="group flex min-h-11 items-start justify-between gap-3 rounded-xl border border-border/70 bg-surface p-4 shadow-sm transition hover:border-brand/40">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{s.orgao}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{s.nomes.join(" e ")}</span>
              </span>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted group-hover:text-brand" aria-hidden />
            </a>
          ))}
        </div>
        <p className="text-xs text-ink-muted">Os sites abrem numa nova aba. Para copiar CPF/CNPJ e nome das partes, use a seção Certidões dentro do processo.</p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Vendas em andamento</h2>
          <nav className="flex gap-2 overflow-x-auto" aria-label="Filtrar vendas">
            {FILTROS.map((f) => (
              <Link key={f.chave} href={`/certidoes?filtro=${f.chave}`} aria-current={filtro === f.chave ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium ${filtro === f.chave ? "border-brand bg-brand text-white" : "border-border/80 bg-surface text-ink-muted hover:text-ink"}`}>
                {f.rotulo} <span className="ml-1.5 tabular-nums opacity-80">{contagem[f.chave]}</span>
              </Link>
            ))}
          </nav>
        </div>

        {visiveis.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-ink-muted">
            {filtro === "atencao" ? "Nenhuma certidão vencida, vencendo ou com algo constando. Veja as vendas com pendências para saber o que falta emitir." : filtro === "pendentes" ? "Todas as vendas em andamento já têm as 8 certidões das duas partes." : "Nenhuma venda em andamento."}
          </p>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-surface shadow-sm">
            {visiveis.map((l) => (
              <li key={l.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-ink">{l.titulo}</p>
                  {l.proximoVencimento && <p className="mt-0.5 text-xs text-ink-muted">Próximo vencimento: {dataBR(l.proximoVencimento)}</p>}
                  {l.atencao > 0 && <p className="mt-1 text-xs font-semibold text-rose-700">{l.atencao} certidã{l.atencao === 1 ? "o pede" : "es pedem"} atenção</p>}
                </div>
                <Parte rotulo="Vendedor" r={l.vendedor} />
                <Parte rotulo="Comprador" r={l.comprador} />
                <Link href={`/processos/${l.id}?certidoes=1#certidoes-processo`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border/80 px-3.5 text-sm font-medium text-brand hover:bg-background">
                  Abrir certidões
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
