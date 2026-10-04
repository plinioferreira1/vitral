import Link from "next/link";
import { Download } from "lucide-react";
import { notFound } from "next/navigation";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { createClient } from "@/lib/supabase/server";
import { obterSiteUrl } from "@/lib/site-url";
import { cancelarFichaLocacao } from "../actions";
import type { SupabaseClient } from "@supabase/supabase-js";

const ROTULOS: Record<string, string> = {
  nome_completo: "Nome completo", cpf: "CPF", rg: "RG", nascimento: "Nascimento", estado_civil: "Estado civil",
  telefone: "Telefone", email: "E-mail", endereco: "Endereço", cidade: "Cidade", cep: "CEP",
  profissao: "Profissão", empresa: "Empresa", renda_mensal: "Renda mensal", tempo_empresa: "Tempo na empresa",
  imovel_interesse: "Imóvel de interesse", finalidade: "Finalidade", moradores: "Moradores", possui_pet: "Possui pet",
  garantia: "Garantia", banco: "Banco", agencia: "Agência", conta: "Conta",
  referencia_nome: "Referência pessoal", referencia_telefone: "Telefone da referência",
  veiculo: "Veículo", imovel_proprio: "Imóvel próprio", observacoes: "Observações",
};

export default async function DetalheFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient() as unknown as SupabaseClient;
  const [{ data: ficha }, { data: documentos }, siteUrl] = await Promise.all([
    supabase.from("fichas_cadastrais_locacao").select("*").eq("id", id).single(),
    supabase.from("ficha_locacao_documentos").select("*").eq("ficha_id", id).order("criado_em"),
    obterSiteUrl(),
  ]);
  if (!ficha) notFound();
  const basePublica = process.env.NEXT_PUBLIC_CADASTRO_URL?.replace(/\/$/, "") || `${siteUrl}/cadastro`;
  const link = `${basePublica}/locacao/${ficha.token}`;
  const linksDocumentos = await Promise.all((documentos ?? []).map(async (d) => {
    const { data } = await supabase.storage.from("fichas-locacao").createSignedUrl(d.caminho_storage, 900);
    return { ...d, url: data?.signedUrl };
  }));
  const dados = (ficha.dados ?? {}) as Record<string, string | number | boolean | null>;
  return <div className="mx-auto max-w-5xl space-y-6">
    <div><Link href="/locacao/ficha-cadastral" className="text-sm text-ink-muted hover:text-brand">← Voltar às fichas</Link><div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-3xl font-bold tracking-tight">{ficha.proponente_nome}</h1><p className="mt-1 text-sm text-ink-muted">{ficha.imovel_referencia}</p></div><div className="flex items-center gap-2"><span className="w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">{String(ficha.status).replace("_", " ")}</span>{ficha.status === "concluida" && <a href={`/locacao/ficha-cadastral/${ficha.id}/pdf`} className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white"><Download className="h-4 w-4" /> Baixar PDF assinado</a>}</div></div></div>
    <section className="rounded-xl border border-border bg-white p-5 shadow-sm"><h2 className="font-semibold">Link do cliente</h2><p className="mt-1 text-sm text-ink-muted">Envie este endereço ao proponente. Ele poderá salvar e continuar depois.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><code className="min-w-0 flex-1 truncate rounded-lg bg-background px-3 py-2.5 text-xs">{link}</code><BotaoCopiarLink url={link} rotulo="Copiar link" /><a href={link} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-2 text-center text-xs font-medium">Abrir ficha</a></div></section>
    <div className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]"><section className="rounded-xl border border-border bg-white p-5 shadow-sm"><h2 className="font-semibold">Dados informados</h2>{Object.keys(dados).length === 0 ? <p className="mt-4 text-sm text-ink-muted">O proponente ainda não iniciou o preenchimento.</p> : <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">{Object.entries(dados).filter(([,v]) => v !== "" && v !== null && v !== false).map(([chave, valor]) => <div key={chave} className="border-b border-border pb-3"><dt className="text-xs font-medium text-ink-muted">{ROTULOS[chave] ?? chave.replaceAll("_", " ")}</dt><dd className="mt-1 break-words text-sm font-medium">{typeof valor === "boolean" ? "Sim" : String(valor)}</dd></div>)}</dl>}</section>
      <div className="space-y-5"><section className="rounded-xl border border-border bg-white p-5 shadow-sm"><h2 className="font-semibold">Documentos</h2>{linksDocumentos.length === 0 ? <p className="mt-3 text-sm text-ink-muted">Nenhum documento anexado.</p> : <div className="mt-3 space-y-2">{linksDocumentos.map((d) => d.url ? <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-border p-3 text-sm hover:border-brand"><span className="block font-medium">{d.nome_arquivo}</span><span className="text-xs text-ink-muted">{d.tipo}</span></a> : null)}</div>}</section>
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm"><h2 className="font-semibold">Controle</h2><div className="mt-3 space-y-2 text-sm text-ink-muted"><p>Criada em {new Date(ficha.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p><p>Expira em {new Date(ficha.expira_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>{ficha.concluido_em && <p>Concluída em {new Date(ficha.concluido_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}</div>{ficha.status !== "cancelada" && ficha.status !== "concluida" && <form action={cancelarFichaLocacao} className="mt-4"><input type="hidden" name="id" value={ficha.id} /><button className="text-sm font-semibold text-rose-700">Cancelar link</button></form>}</section></div>
    </div>
  </div>;
}
