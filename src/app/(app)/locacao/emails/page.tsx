import { redirect } from "next/navigation";
import Link from "next/link";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { CaixaEntradaLocacao } from "./caixa-entrada";

export const dynamic = "force-dynamic";

export default async function EmailsLocacaoPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  if (!usuario.ativo || !(
    usuario.perfil === "admin" ||
    usuario.perfil === "gerente" ||
    usuario.nivel_acesso === "diretor" ||
    usuario.nivel_acesso === "gerente"
  )) redirect("/locacao");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CabecalhoPagina titulo="E-mails da Locação" descricao="Mensagens recebidas pelo Zoho Mail, com destaque para respostas às solicitações do VITRAL." />
        <Link href="/locacao/debitos?aba=solicitacoes" className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink-muted hover:text-ink">
          Solicitações às administradoras
        </Link>
      </div>
      <CaixaEntradaLocacao />
    </div>
  );
}
