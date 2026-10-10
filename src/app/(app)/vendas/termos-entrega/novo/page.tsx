import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2, Search } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { createClient } from "@/lib/supabase/server";
import { ROTULO_STATUS, type StatusTermo } from "@/lib/termo-entrega/conteudo";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { criarTermo } from "../actions";
import { carregarPermissoes } from "../dados";

const BASE = "/vendas/termos-entrega";

type Venda = {
  id: string;
  numero_processo: string;
  status: string;
  imoveis: { endereco: string; matricula: string | null } | null;
  comprador: { nome: string } | null;
  vendedor: { nome: string } | null;
  responsavel: { nome: string } | null;
};

const semAcento = (t: string | null | undefined) => (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function NovoTermoPage({ searchParams }: { searchParams: Promise<{ q?: string; processo?: string }> }) {
  const sp = await searchParams;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const perms = await carregarPermissoes(supabase, user.id, usuario.nivel_acesso);
  if (!perms.operar) redirect(perms.ver ? BASE : "/");

  const [{ data: vendasRaw }, { data: existentes }] = await Promise.all([
    supabase
      .from("processos")
      .select(
        `id, numero_processo, status,
         imoveis ( endereco, matricula ),
         comprador:clientes!processos_comprador_id_fkey ( nome ),
         vendedor:clientes!processos_vendedor_id_fkey ( nome ),
         responsavel:usuarios!processos_responsavel_id_fkey ( nome )`
      )
      .eq("categoria", "venda")
      .order("criado_em", { ascending: false })
      .limit(400),
    supabase.from("termos_entrega").select("id, codigo, status, processo_id").neq("status", "cancelado").not("processo_id", "is", null),
  ]);
  const vendas = (vendasRaw ?? []) as unknown as Venda[];
  const porVenda = new Map<string, { id: string; codigo: string; status: string }[]>();
  for (const t of existentes ?? []) porVenda.set(t.processo_id!, [...(porVenda.get(t.processo_id!) ?? []), t]);

  const q = semAcento(sp.q).trim();
  const filtradas = vendas
    .filter((v) => (sp.processo ? v.id === sp.processo : true))
    .filter((v) => !q || [v.comprador?.nome, v.vendedor?.nome, v.imoveis?.endereco, v.imoveis?.matricula, v.numero_processo].some((c) => semAcento(c).includes(q)))
    .slice(0, 40);

  return (
    <div className="mx-auto w-full min-w-0 space-y-5">
      <div>
        <VoltarLink href={BASE} label="Termos de entrega de chaves" />
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Novo termo de entrega de chaves</h1>
        <p className="mt-1 text-sm text-ink-muted">Escolha a venda: vendedor, comprador e imóvel já vêm preenchidos e você só revisa.</p>
      </div>

      <form method="get" className={`${CARD_CLASS} flex flex-wrap items-end gap-3 p-4`}>
        <label className="block min-w-[240px] flex-1">
          <span className="mb-1 block text-xs font-medium text-ink-muted">Selecionar venda</span>
          <span className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input name="q" defaultValue={sp.q ?? ""} autoFocus placeholder="Comprador, vendedor, endereço, matrícula ou código do processo" className={`${INPUT_CLASS} pl-9`} />
          </span>
        </label>
        <button type="submit" className={SECONDARY_BUTTON_CLASS}>
          Pesquisar
        </button>
        {(sp.q || sp.processo) && (
          <Link href={`${BASE}/novo`} className="pb-2.5 text-xs font-medium text-brand hover:underline">
            Ver todas
          </Link>
        )}
      </form>

      <ul className="space-y-3">
        {filtradas.map((v) => {
          const termos = porVenda.get(v.id) ?? [];
          return (
            <li key={v.id} className={`${CARD_CLASS} flex flex-wrap items-center justify-between gap-4 p-4`}>
              <div className="min-w-0 flex-1 basis-72">
                <p className="font-medium text-ink">{v.imoveis?.endereco ?? "Imóvel não informado"}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {v.vendedor?.nome ?? "Sem vendedor"} → {v.comprador?.nome ?? "sem comprador"}
                </p>
                <p className="num mt-0.5 text-[11px] text-ink-muted">
                  {v.numero_processo}
                  {v.imoveis?.matricula ? ` · matrícula ${v.imoveis.matricula}` : ""}
                  {v.responsavel?.nome ? ` · ${v.responsavel.nome}` : ""}
                </p>
                {termos.length > 0 && (
                  <p className="mt-1.5 text-xs text-amber-800">
                    Já existe termo para esta venda:{" "}
                    {termos.map((t, i) => (
                      <span key={t.id}>
                        {i > 0 && ", "}
                        <Link href={`${BASE}/${t.id}`} className="font-medium underline">
                          {t.codigo} ({ROTULO_STATUS[t.status as StatusTermo].toLowerCase()})
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <form action={criarTermo}>
                <input type="hidden" name="processo_id" value={v.id} />
                <BotaoEnviar className={termos.length ? SECONDARY_BUTTON_CLASS : PRIMARY_BUTTON_CLASS} textoEnviando="Criando…">
                  <FilePlus2 size={15} /> {termos.length ? "Criar outro termo" : "Criar termo"}
                </BotaoEnviar>
              </form>
            </li>
          );
        })}
      </ul>
      {filtradas.length === 0 && <div className={`${CARD_CLASS} px-6 py-10 text-center text-sm text-ink-muted`}>Nenhuma venda encontrada com essa pesquisa.</div>}
      {!q && !sp.processo && vendas.length > filtradas.length && <p className="text-center text-xs text-ink-muted">Mostrando as {filtradas.length} vendas mais recentes. Use a pesquisa para achar as demais.</p>}

      <div className={`${CARD_CLASS} flex flex-wrap items-center justify-between gap-3 p-4`}>
        <p className="text-sm text-ink-muted">A venda não está cadastrada no Vitral? Comece em branco e preencha os dados à mão.</p>
        <form action={criarTermo}>
          <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Criando…">
            Começar em branco
          </BotaoEnviar>
        </form>
      </div>
    </div>
  );
}
